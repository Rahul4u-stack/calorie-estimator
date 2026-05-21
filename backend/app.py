import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
from dotenv import load_dotenv

load_dotenv()

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
        return jsonify({'result': 'Food items identified:\n• Sample Food Item: ~350 calories\n• Side Dish: ~150 calories\n\nTotal estimated calories: ~500 calories\n\nNote: This is TEST MODE. Set TEST_MODE=false in .env and add Anthropic API credits to get real analysis.'})

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
                        {
                            "type": "text",
                            "text": """Analyze this food image and provide calorie estimates.

Please respond in this exact format:
Food items identified:
• [Food item 1]: ~[calories] calories
• [Food item 2]: ~[calories] calories
(list each distinct food item you can see)

Total estimated calories: ~[total] calories

Note: [Any relevant notes about portion sizes, confidence level, or if this isn't a food image]

If this is not a food image, respond with: "This doesn't appear to be a food image. Please upload a photo of food to get calorie estimates."
"""
                        }
                    ],
                }
            ],
        )
        result = response.content[0].text
        return jsonify({'result': result})
    except anthropic.AuthenticationError:
        return jsonify({'error': 'Invalid API key. Check your ANTHROPIC_API_KEY in the .env file.'}), 500
    except anthropic.BadRequestError as e:
        err_msg = str(e).lower()
        if 'credit balance' in err_msg:
            return jsonify({'error': 'Anthropic API credits exhausted. Please add credits at console.anthropic.com/settings/billing'}), 402
        if 'could not process image' in err_msg:
            return jsonify({'error': 'Could not process this image. Try a smaller JPG or PNG photo (under 5MB).'}), 400
        return jsonify({'error': f'API request error: {str(e)}'}), 400
    except anthropic.APIError as e:
        return jsonify({'error': f'AI service error: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')
