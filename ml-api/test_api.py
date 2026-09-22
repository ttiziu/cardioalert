"""Prueba de la validación de entrada: no necesita el modelo cargado."""

import numpy as np
import pytest
from fastapi import HTTPException

import main
from main import WINDOW_SIZE, occlusion_importance, validate_window


def test_ventana_valida_queda_con_forma_de_modelo():
    assert validate_window([0.0] * WINDOW_SIZE).shape == (1, WINDOW_SIZE, 1)


def test_rechaza_ventana_de_largo_incorrecto():
    with pytest.raises(HTTPException) as e:
        validate_window([0.0] * 1250)
    assert e.value.status_code == 422


def test_rechaza_valores_no_finitos():
    window = [0.0] * WINDOW_SIZE
    window[10] = float("nan")
    with pytest.raises(HTTPException) as e:
        validate_window(window)
    assert "no finitos" in e.value.detail


class FakeModel:
    """Modelo de juguete: la clase 2 depende solo del tramo 100-149."""

    def predict(self, batch, verbose=0):
        energy = np.abs(batch[:, 100:150, 0]).sum(axis=1)
        p = np.clip(energy / 50.0, 0, 1)
        return np.stack([1 - p, np.zeros_like(p), p], axis=1)


def test_importancia_marca_el_tramo_del_que_depende_la_prediccion(monkeypatch):
    window = np.zeros((1, WINDOW_SIZE, 1), dtype=np.float32)
    window[0, 100:150, 0] = 1.0
    monkeypatch.setattr(main, "model", FakeModel())

    importance = occlusion_importance(window, class_index=2, baseline=1.0, segment=50)

    assert len(importance) == WINDOW_SIZE // 50
    assert importance[2] == 1.0  # muestras 100-149
    assert max(importance[:2]) == 0.0
