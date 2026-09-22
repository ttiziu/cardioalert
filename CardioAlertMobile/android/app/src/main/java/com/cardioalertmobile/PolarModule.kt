package com.cardioalertmobile

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.polar.androidcommunications.api.ble.model.DisInfo
import com.polar.sdk.api.PolarBleApi
import com.polar.sdk.api.PolarBleApiCallback
import com.polar.sdk.api.PolarBleApiDefaultImpl
import com.polar.sdk.api.model.EcgSample
import com.polar.sdk.api.model.PolarDeviceInfo
import com.polar.sdk.api.model.PolarHealthThermometerData
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

class PolarModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "PolarModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var api: PolarBleApi? = null
    private var scanJob: Job? = null
    private var ecgJob: Job? = null
    private var hrJob: Job? = null
    private var connectedDeviceId: String? = null

    private fun emit(event: String, payload: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, payload)
    }

    private fun emitError(scope: String, error: Throwable) {
        emit("PolarError", Arguments.createMap().apply {
            putString("scope", scope)
            putString("message", error.message ?: "$scope failed")
        })
    }

    private fun ensureApi(): PolarBleApi {
        api?.let { return it }
        val created = PolarBleApiDefaultImpl.defaultImplementation(
            reactApplicationContext.applicationContext,
            setOf(
                PolarBleApi.PolarBleSdkFeature.FEATURE_HR,
                PolarBleApi.PolarBleSdkFeature.FEATURE_POLAR_ONLINE_STREAMING,
                PolarBleApi.PolarBleSdkFeature.FEATURE_BATTERY_INFO,
                PolarBleApi.PolarBleSdkFeature.FEATURE_DEVICE_INFO,
            )
        )
        created.setApiCallback(object : PolarBleApiCallback() {
            override fun deviceConnected(polarDeviceInfo: PolarDeviceInfo) {
                connectedDeviceId = polarDeviceInfo.deviceId
                emit("PolarConnectionState", Arguments.createMap().apply {
                    putString("state", "connected")
                    putString("deviceId", polarDeviceInfo.deviceId)
                    putString("name", polarDeviceInfo.name)
                })
            }

            override fun deviceConnecting(polarDeviceInfo: PolarDeviceInfo) {
                emit("PolarConnectionState", Arguments.createMap().apply {
                    putString("state", "connecting")
                    putString("deviceId", polarDeviceInfo.deviceId)
                })
            }

            override fun deviceDisconnected(polarDeviceInfo: PolarDeviceInfo) {
                connectedDeviceId = null
                emit("PolarConnectionState", Arguments.createMap().apply {
                    putString("state", "disconnected")
                    putString("deviceId", polarDeviceInfo.deviceId)
                })
            }

            override fun batteryLevelReceived(identifier: String, level: Int) {
                emit("PolarBattery", Arguments.createMap().apply {
                    putString("deviceId", identifier)
                    putInt("level", level)
                })
            }

            // Abstractos en el SDK 8.x; CardioAlert no los necesita.
            override fun disInformationReceived(identifier: String, disInfo: DisInfo) {}
            override fun htsNotificationReceived(identifier: String, data: PolarHealthThermometerData) {}
        })
        api = created
        return created
    }

    @ReactMethod
    fun startScan(promise: Promise) {
        scanJob?.cancel()
        scanJob = scope.launch {
            ensureApi().searchForDevice()
                .catch { emitError("scan", it) }
                .collect { info ->
                    emit("PolarDeviceFound", Arguments.createMap().apply {
                        putString("deviceId", info.deviceId)
                        putString("name", info.name)
                        putInt("rssi", info.rssi)
                    })
                }
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun stopScan(promise: Promise) {
        scanJob?.cancel()
        scanJob = null
        promise.resolve(null)
    }

    @ReactMethod
    fun connect(deviceId: String, promise: Promise) {
        try {
            ensureApi().connectToDevice(deviceId)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CONNECT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            ecgJob?.cancel(); ecgJob = null
            hrJob?.cancel(); hrJob = null
            connectedDeviceId?.let { ensureApi().disconnectFromDevice(it) }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DISCONNECT_ERROR", e.message, e)
        }
    }

    /** El H10 entrega ECG a 130 Hz en microvolts; el remuestreo a 250 Hz se hace en TS. */
    @ReactMethod
    fun startEcgStream(promise: Promise) {
        val deviceId = connectedDeviceId
            ?: return promise.reject("NO_DEVICE", "No hay un Polar conectado")
        ecgJob?.cancel()
        ecgJob = scope.launch {
            try {
                val settings = ensureApi()
                    .requestStreamSettings(deviceId, PolarBleApi.PolarDeviceDataType.ECG)
                    .maxSettings()
                ensureApi().startEcgStreaming(deviceId, settings)
                    .catch { emitError("ecg", it) }
                    .collect { data ->
                        val samples = Arguments.createArray()
                        val timestamps = Arguments.createArray()
                        for (sample in data.samples) {
                            if (sample !is EcgSample) continue
                            samples.pushInt(sample.voltage)
                            timestamps.pushDouble(sample.timeStamp.toDouble())
                        }
                        emit("PolarEcgData", Arguments.createMap().apply {
                            putString("deviceId", deviceId)
                            putArray("samples", samples)
                            putArray("timestamps", timestamps)
                        })
                    }
            } catch (e: Exception) {
                emitError("ecg", e)
            }
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun stopEcgStream(promise: Promise) {
        ecgJob?.cancel()
        ecgJob = null
        promise.resolve(null)
    }

    @ReactMethod
    fun startHrStream(promise: Promise) {
        val deviceId = connectedDeviceId
            ?: return promise.reject("NO_DEVICE", "No hay un Polar conectado")
        hrJob?.cancel()
        hrJob = scope.launch {
            ensureApi().startHrStreaming(deviceId)
                .catch { emitError("hr", it) }
                .collect { data ->
                    val sample = data.samples.lastOrNull() ?: return@collect
                    val rr = Arguments.createArray()
                    sample.rrsMs.forEach { rr.pushInt(it) }
                    emit("PolarHrData", Arguments.createMap().apply {
                        putInt("hr", sample.hr)
                        putArray("rrMs", rr)
                        putBoolean("contactSupported", sample.contactStatusSupported)
                        putBoolean("contact", sample.contactStatus)
                    })
                }
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun stopHrStream(promise: Promise) {
        hrJob?.cancel()
        hrJob = null
        promise.resolve(null)
    }

    // Requeridos por NativeEventEmitter en RN.
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    override fun invalidate() {
        scope.cancel()
        api?.shutDown()
        api = null
        super.invalidate()
    }
}
