from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/predict', methods=['GET'])
def predict():
    sample_prediction = {
        "recommendedRoute": ['Stop 1', 'Stop 2', 'Stop 3'],
        "predictedDelay": 5  # minutes
    }
    return jsonify(sample_prediction)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
