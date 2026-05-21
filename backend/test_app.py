import pytest
import json
import io
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    """Test that health check endpoint works"""
    response = client.get('/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'

def test_analyze_no_file(client):
    """Test that missing file returns 400"""
    response = client.post('/api/analyze')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_analyze_invalid_file_type(client):
    """Test that non-image file returns 400"""
    data = {
        'image': (io.BytesIO(b'not an image'), 'test.pdf')
    }
    response = client.post('/api/analyze', data=data, content_type='multipart/form-data')
    assert response.status_code == 400

def test_analyze_with_mock_claude(client):
    """Test successful analysis with mocked Claude API"""
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Food items identified:\n• Pizza slice: ~285 calories\n\nTotal estimated calories: ~285 calories")]

    with patch('app.client.messages.create', return_value=mock_response):
        # Create a minimal valid PNG image (1x1 pixel)
        png_data = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00'
            b'\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18'
            b'\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        data = {
            'image': (io.BytesIO(png_data), 'food.png')
        }
        response = client.post('/api/analyze', data=data, content_type='multipart/form-data')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert 'result' in result
        assert 'calories' in result['result'].lower()
