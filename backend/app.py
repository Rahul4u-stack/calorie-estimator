import os
import base64
import json
import logging
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5173", os.getenv("FRONTEND_URL", "*")])

TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not supported. Please upload PNG, JPG, JPEG, GIF or WEBP'}), 400

    image_data = file.read()

    MAX_SIZE = 5 * 1024 * 1024  # 5MB
    if len(image_data) > MAX_SIZE:
        return jsonify({'error': f'Image too large ({len(image_data) // (1024*1024)}MB). Please upload an image under 5MB.'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    media_type_map = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    }
    media_type = media_type_map.get(ext, 'image/jpeg')

    image_b64 = base64.standard_b64encode(image_data).decode('utf-8')

    if TEST_MODE:
        return jsonify({
            'isFood': True,
            'items': [
                {'name': 'Sample Food Item', 'calories': 350},
                {'name': 'Side Dish', 'calories': 150},
            ],
            'totalCalories': 500,
            'notes': 'TEST MODE. Set TEST_MODE=false in .env and add Anthropic API credits for real analysis.',
        })

    prompt_text = """Analyze this food image and return calorie estimates as JSON.

Return ONLY a valid JSON object, no surrounding text or markdown fences. Use this schema:

{
  "isFood": boolean,
  "items": [{"name": string, "calories": number}],
  "totalCalories": number,
  "notes": string
}

Rules:
- If the image is not food, set "isFood": false, leave "items" as [], "totalCalories" as 0, and put a short message in "notes".
- Otherwise list each distinct food item you can see with its estimated calories.
- "totalCalories" must equal the sum of items[].calories.
- Use "notes" for portion size assumptions or confidence caveats.
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": prompt_text},
                    ],
                }
            ],
        )
        if not response.content or not response.content[0].text:
            logger.error("Empty response from Claude API")
            return jsonify({'error': 'Empty response from AI. Please try again.'}), 502

        raw = response.content[0].text.strip()
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            logger.error("Claude response did not contain JSON: %s", raw[:300])
            return jsonify({'error': 'AI returned an unexpected response. Please try again.'}), 502
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError as e:
            logger.error("JSON parse failed: %s | raw=%s", e, raw[:300])
            return jsonify({'error': 'AI returned malformed data. Please try again.'}), 502

        return jsonify({
            'isFood': bool(parsed.get('isFood', True)),
            'items': parsed.get('items', []),
            'totalCalories': parsed.get('totalCalories', 0),
            'notes': parsed.get('notes', ''),
        })
    except anthropic.AuthenticationError:
        logger.error("Anthropic AuthenticationError")
        return jsonify({'error': 'Invalid API key. Check your ANTHROPIC_API_KEY in the .env file.'}), 500
    except anthropic.BadRequestError as e:
        logger.error("Anthropic BadRequestError: %s", e)
        err_msg = str(e).lower()
        if 'credit balance' in err_msg:
            return jsonify({'error': 'Anthropic API credits exhausted. Please add credits at console.anthropic.com/settings/billing'}), 402
        if 'could not process image' in err_msg:
            return jsonify({'error': 'Could not process this image. Try a smaller JPG or PNG photo (under 5MB).'}), 400
        return jsonify({'error': f'API request error: {str(e)}'}), 400
    except anthropic.APIError as e:
        logger.error("Anthropic APIError: %s", e)
        return jsonify({'error': f'AI service error: {str(e)}'}), 500
    except Exception as e:
        logger.exception("Unexpected error in /api/analyze")
        return jsonify({'error': 'Unexpected server error. Please try again.'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')
