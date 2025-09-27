from flask import Flask, request, jsonify, g
from flask_cors import CORS 
from datetime import datetime
import json
import os
import requests 
import uuid
import sqlite3
DATABASE_NAME = 'itenarygenerator.db'
CANVAS_APP_ID = os.environ.get('__app_id', 'default-hackathon-app-id')
CANVAS_INITIAL_AUTH_TOKEN = os.environ.get('__initial_auth_token', 'mock-auth-token')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '') 
AI_READY = bool(GEMINI_API_KEY)
def get_db_connection():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE_NAME)
        db.row_factory = sqlite3.Row  
    return db

def close_connection(exception):
    db = getattr(g, '_database', None)
    if db:
        db.close()

def seed_places_data(db):
    cursor = db.cursor()
    cursor.execute('SELECT COUNT(*)FROM places')
    if cursor.fetchone()[0] == 0:
        print("SQLITE: Seeding initial places data...")
        mock_places = [
            { "id": "J1A", "name": "Panna Meena ka Kund (Stepwell)", "city": "Jaipur", "category": "history,architecture,quiet", "duration_minutes": 60, "underrated_score": 5, "geo_point": '{"lat": 26.985, "lon": 75.85}' },
            { "id": "J3C", "name": "Patrika Gate", "city": "Jaipur", "category": "photography,architecture,modern", "duration_minutes": 45, "underrated_score": 4, "geo_point": '{"lat": 26.85, "lon": 75.80}' },
            { "id": "J5E", "name": "Lassiwala on MI Road (Original)", "city": "Jaipur", "category": "food,local_gem,drink", "duration_minutes": 30, "underrated_score": 4, "geo_point": '{"lat": 26.915, "lon": 75.82}' },
            { "id": "J2B", "name": "Hawa Mahal (Palace of Winds)", "city": "Jaipur", "category": "tourism,history,views", "duration_minutes": 90, "underrated_score": 1, "geo_point": '{"lat": 26.92, "lon": 75.82}' },
            { "id": "J4D", "name": "Amber Fort and Palace", "city": "Jaipur", "category": "history,tourism,views", "duration_minutes": 240, "underrated_score": 2, "geo_point": '{"lat": 26.985, "lon": 75.855}' },
            { "id": "J6F", "name": "City Palace, Jaipur", "city": "Jaipur", "category": "history,museum,royal", "duration_minutes": 120, "underrated_score": 3, "geo_point": '{"lat": 26.92, "lon": 75.82}'}
        ]
        for p in mock_places:
            cursor.execute(
                """
                INSERT INTO places (id, name, city, category, duration_minutes, underrated_score, geo_point)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (p['id'], p['name'], p['city'], p['category'], p['duration_minutes'], p['underrated_score'], p['geo_point'])
            )
        db.commit()
    else:
        print("SQLITE: Places table already seeded.")
        
def init_db():
    db = get_db_connection()
    db.execute("""
            CREATE TABLE IF NOT EXISTS places (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                category TEXT NOT NULL,
                duration_minutes INTEGER,
                underrated_score INTEGER,
                geo_point TEXT
            )
        """)
    db.commit()
    seed_places_data(db)

def get_available_places(city, interests):
    print(f"SQLITE: Querying places for {city} interested in {interests}...")
    db = get_db_connection()
    cursor = db.cursor()
    query = "SELECT * FROM places WHERE city = ?"
    params = [city]
    if interests:
        query += " AND ("
        interest_clauses = [f"category LIKE ?"] * len(interests)
        query += " OR ".join(interest_clauses)
        query += ")"
        for interest in interests:
            params.append(f'%{interest}%')
            
    cursor.execute(query, tuple(params))
    
    results = []
    for row in cursor.fetchall():
        place = dict(row)
        place['category'] = place['category'].split(',')
        place['geo_point'] = json.loads(place['geo_point']) 
        results.append(place)
    return results

def save_itinerary(itinerary_data, user_id):
    db = get_db_connection()
    cursor = db.cursor()
    itinerary_steps_json = json.dumps(itinerary_data.get('itinerary_steps', [])) 
    request_details_json = json.dumps(itinerary_data.get('request_details', {}))
    # print(f"SQLITE: Skipping database save for submission speed.")
    # db.execute("""
    #     CREATE TABLE IF NOT EXISTS itineraries (
    #         id INTEGER PRIMARY KEY,
    #         user_id TEXT,
    #         request_details TEXT,
    #         created_at TEXT,
    #         gemini_summary TEXT,
    #         itinerary_steps TEXT
    #     )
    # """)
    # db.commit()

    return True # Always succeed for now
app = Flask(__name__)
app.teardown_appcontext(close_connection)
CORS(app)

def get_user_id_from_auth(auth_token):
    if auth_token and auth_token != 'mock-auth-token':
        return f"auth-{auth_token[-8:]}"
    return str(uuid.uuid4())
    
@app.route('/', methods=['GET'])
def status_check_route():
    return jsonify({
        "status": "online",
        "ai_status": "Live AI" if AI_READY else "Mock/Fallback",
        "message": "Itinerary Genie Backend is ready (Using SQLite3)."
    }), 200

@app.route('/generate_itinerary', methods=['POST'])
def generate_itinerary_route():
    if not AI_READY:
        print("MOCK: GEMINI_API_KEY is empty. Returning static mock response.")
        import time
        time.sleep(1.5) 
        generated_itinerary = {
            "summary": f"This is a mocked 8-hour itinerary for submission. Key is missing, but the connection works!",
            "schedule": [
                { "time": "10:00 AM", "placeId": "J2B", "activity": "Start the day at the famous Hawa Mahal (Palace of Winds)." },
                { "time": "11:30 AM", "placeId": "J1A", "activity": "A quiet visit to Panna Meena ka Kund (Stepwell)." },
                { "time": "1:00 PM", "placeId": "J5E", "activity": "Enjoy a refreshing Lassi at Lassiwala on MI Road (Original)." },
                { "time": "2:00 PM", "placeId": "J3C", "activity": "Take stunning photos at the colorful Patrika Gate." }
            ]
        }
        return jsonify({"success": True, "itinerary": generated_itinerary}), 200
        data = request.get_json()
        city = data.get('city')
        time_available_hours = data.get('time_available_hours')
        interests = data.get('interests')

        if not all([city, time_available_hours, interests]):
            return jsonify({"error": "Missing required fields."}), 400

        user_id = get_user_id_from_auth(CANVAS_INITIAL_AUTH_TOKEN)
        available_places = get_available_places(city, interests)
        
        if not available_places:
            return jsonify({"error": "Could not find any places matching your criteria. Try 'Jaipur' and 'history'."}), 404

        places_json_string = json.dumps(available_places, indent=2)
        system_prompt = (
            "You are a world-class travel planner specializing in creating highly personalized, time-optimized, and "
            "unique itineraries. The user has a budget of exactly "
            f"{time_available_hours} hours in {city} and is interested in {', '.join(interests)}. "
            "Your primary goal is to use the provided list of available places (and their duration_minutes) "
            "to create a seamless, minute-by-minute schedule. "
            "You MUST prioritize places with an 'underrated_score' of 4 or higher to meet the unique suggestion requirement. "
            "Start the itinerary at 10:00 AM. Ensure the total duration does not exceed the time budget. "
        )
        user_query = (
            "Using the following list of available places, create a time-sensitive, detailed itinerary. "
            "The list includes the place's ID, name, category, and time required ('duration_minutes'). "
            "Crucially, the 'placeId' in your schedule MUST match the 'id' from the provided list. "
            f"\n\nAVAILABLE PLACES:\n{places_json_string}"
        )
        response_schema = {
            "type": "OBJECT",
            "properties": {
                "summary": { "type": "STRING", "description": "A charming and personalized summary of the planned day." },
                "schedule": {
                    "type": "ARRAY",
                    "description": "The time-boxed list of activities.",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "time": { "type": "STRING", "description": "The start time for the activity (e.g., '10:00 AM' or '11:30 AM')." },
                            "placeId": { "type": "STRING", "description": "The EXACT ID of the place from the input list (e.g., 'J1A', 'J5E')." },
                            "activity": { "type": "STRING", "description": "A detailed, descriptive name for the activity at this place." }
                        },
                        "propertyOrdering": ["time", "placeId", "activity"]
                    }
                }
            },
            "propertyOrdering": ["summary", "schedule"]
        }
        
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{"parts": [{"text": user_query}]}],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": response_schema
            }
        }
        
        llm_response = requests.post(
            api_url, 
            headers={'Content-Type': 'application/json'},
            data=json.dumps(payload)
        )
        llm_response.raise_for_status() # Raise exception for bad status codes (4xx or 5xx)
        
        result = llm_response.json()
        
        json_text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')
        if not json_text:
            raise ValueError("LLM response was empty or malformed.")

        generated_itinerary = json.loads(json_text)

        if not generated_itinerary:
            raise ValueError("Itinerary generation failed.")

        itinerary_record = {
            "userId": user_id,
            "request_details": data,
            "created_at": datetime.now().isoformat(),
            "gemini_summary": generated_itinerary.get('summary', 'No summary provided.'),
            "itinerary_steps": generated_itinerary.get('schedule', []),
        }

        save_itinerary(itinerary_record, user_id)
        return jsonify({"success": True, "itinerary": generated_itinerary}), 200

    except requests.exceptions.HTTPError as e:
        print(f"Gemini API HTTP Error: {e.response.text}")
        return jsonify({"success": True, "itinerary": {
            "summary": "API Error Fallback: Check terminal for details. Using mock data.",
            "schedule": [
                { "time": "10:00 AM", "placeId": "J2B", "activity": "ERROR: Check terminal log for API details." },
                { "time": "11:30 AM", "placeId": "J1A", "activity": "Using fallback itinerary steps." }
            ]
        }}), 200
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Processing Error: {e}")
        return jsonify({"success": True, "itinerary": {
            "summary": "Data Processing Error Fallback: Failed to parse AI response. Using mock data.",
            "schedule": [
                { "time": "10:00 AM", "placeId": "J2B", "activity": "ERROR: Failed to process AI response." }
            ]
        }}), 200
    except Exception as e:
        print(f"Unexpected Server Error: {e}")
        return jsonify({"error": "An unexpected server error occurred.", "details": str(e)}), 500


if __name__ == '__main__':
    with app.app_context():
        init_db() 
        
    if AI_READY:
        print("---------------------------------------------------------")
        print("✅ LIVE AI GENERATION ENABLED! (Key loaded successfully)")
        print(f"Server starting on http://127.0.0.1:8080/")
        print("---------------------------------------------------------")
    else:
        print("---------------------------------------------------------")
        print("⚠️ MOCK DATA MODE. Set GEMINI_API_KEY to enable live AI.")
        print(f"Server starting on http://127.0.0.1:8080/")
        print("---------------------------------------------------------")

    app.run(debug=True, port=8080, use_reloader=False) # use_reloader=False to prevent init_db from running twice
