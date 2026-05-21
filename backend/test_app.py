import io
import json
from unittest.mock import MagicMock, patch

import pytest

from app import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as test_client:
        yield test_client


def _png_bytes():
    return (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00'
        b'\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18'
        b'\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )


def _mock_claude_response(text):
    response = MagicMock()
    response.content = [MagicMock(text=text)]
    return response


# ---------- Health & input validation ----------

def test_health_endpoint(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert json.loads(response.data) == {'status': 'healthy'}


def test_analyze_missing_file_returns_400(client):
    response = client.post('/api/analyze')
    assert response.status_code == 400
    assert 'error' in json.loads(response.data)


def test_analyze_empty_filename_returns_400(client):
    data = {'image': (io.BytesIO(b''), '')}
    response = client.post('/api/analyze', data=data, content_type='multipart/form-data')
    assert response.status_code == 400


def test_analyze_invalid_file_type_returns_400(client):
    data = {'image': (io.BytesIO(b'not an image'), 'test.pdf')}
    response = client.post('/api/analyze', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    body = json.loads(response.data)
    assert 'PNG' in body['error'] or 'supported' in body['error'].lower()


def test_analyze_oversized_file_returns_400(client):
    big_payload = b'\x89PNG' + b'\x00' * (6 * 1024 * 1024)
    data = {'image': (io.BytesIO(big_payload), 'huge.png')}
    response = client.post('/api/analyze', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    assert 'too large' in json.loads(response.data)['error'].lower()


# ---------- Happy path: structured JSON response ----------

def test_analyze_returns_structured_json(client):
    claude_text = json.dumps({
        'isFood': True,
        'items': [
            {'name': 'Pizza slice', 'calories': 285},
            {'name': 'Side salad', 'calories': 65},
        ],
        'totalCalories': 350,
        'notes': 'Assumes one medium slice.',
    })

    with patch('app.client.messages.create', return_value=_mock_claude_response(claude_text)):
        data = {'image': (io.BytesIO(_png_bytes()), 'food.png')}
        response = client.post('/api/analyze', data=data, content_type='multipart/form-data')

    assert response.status_code == 200
    body = json.loads(response.data)
    assert body['isFood'] is True
    assert body['totalCalories'] == 350
    assert len(body['items']) == 2
    assert body['items'][0]['name'] == 'Pizza slice'
    assert body['items'][0]['calories'] == 285
    assert 'medium slice' in body['notes']


def test_analyze_handles_non_food_response(client):
    claude_text = json.dumps({
        'isFood': False,
        'items': [],
        'totalCalories': 0,
        'notes': "This doesn't look like food.",
    })

    with patch('app.client.messages.create', return_value=_mock_claude_response(claude_text)):
        data = {'image': (io.BytesIO(_png_bytes()), 'cat.png')}
        response = client.post('/api/analyze', data=data, content_type='multipart/form-data')

    assert response.status_code == 200
    body = json.loads(response.data)
    assert body['isFood'] is False
    assert body['items'] == []


def test_analyze_extracts_json_from_surrounding_text(client):
    # Claude sometimes wraps JSON in prose despite instructions
    claude_text = (
        "Sure! Here's the analysis:\n\n"
        '{"isFood": true, "items": [{"name": "Apple", "calories": 95}], '
        '"totalCalories": 95, "notes": ""}\n\nLet me know if you need more.'
    )

    with patch('app.client.messages.create', return_value=_mock_claude_response(claude_text)):
        data = {'image': (io.BytesIO(_png_bytes()), 'food.png')}
        response = client.post('/api/analyze', data=data, content_type='multipart/form-data')

    assert response.status_code == 200
    body = json.loads(response.data)
    assert body['totalCalories'] == 95


# ---------- Failure modes ----------

def test_analyze_handles_malformed_claude_response(client):
    with patch('app.client.messages.create', return_value=_mock_claude_response('not json at all')):
        data = {'image': (io.BytesIO(_png_bytes()), 'food.png')}
        response = client.post('/api/analyze', data=data, content_type='multipart/form-data')

    assert response.status_code == 502
    assert 'error' in json.loads(response.data)


def test_analyze_handles_empty_claude_response(client):
    empty_response = MagicMock()
    empty_response.content = []

    with patch('app.client.messages.create', return_value=empty_response):
        data = {'image': (io.BytesIO(_png_bytes()), 'food.png')}
        response = client.post('/api/analyze', data=data, content_type='multipart/form-data')

    assert response.status_code == 502
