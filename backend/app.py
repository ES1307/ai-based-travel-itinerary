from flask import Flask, jsonify, request
from flask_cors import CORS
from planner import generate_itinerary

app = Flask(__name__)
CORS(app)


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(silent=True) or {}

    required = ["city", "days", "budget", "style", "interests"]
    missing = [field for field in required if field not in data or data[field] in ("", None, [])]

    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        payload = generate_itinerary({
            "city": data["city"],
            "days": int(data["days"]),
            "budget": data["budget"],
            "style": data["style"],
            "interests": data["interests"],
        })
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)
