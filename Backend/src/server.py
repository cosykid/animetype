import os
import threading
import requests
from flask import Flask, jsonify, request
from flask_socketio import join_room, leave_room, emit, disconnect, SocketIO
from flask_cors import CORS
from typing import List
from threading import Timer
from dotenv import load_dotenv
import redis
import json

from src.room import Room
from src.user import User

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://170.64.131.63:5173"}})
socketio = SocketIO(app, cors_allowed_origins=["http://170.64.131.63:5173"])

load_dotenv()
API_KEY = os.getenv("API_KEY")
API_BASE_URL = "https://animechan.io/api/v1/quotes/random"

# Connect to Redis (Assuming it's on localhost)
redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

lock = threading.Lock()

def getRoomById(id: int):
    rooms = load_rooms()
    return next((room for room in rooms if room.id == id), None)

def save_rooms(rooms: List[Room]):
    redis_client.set('rooms', json.dumps([room.to_dict() for room in rooms]))

def load_rooms():
    data = redis_client.get('rooms')
    if data is None:
        return []
    
    rooms_data = json.loads(data)
    rooms = []

    for room_data in rooms_data:
        room = Room(
            id=room_data["id"],
            capacity=room_data["capacity"],
            name=room_data["name"]
        )
        room.isGameInProgress = room_data["isGameInProgress"]
        room.owner = room_data["owner"]
        room.quote = room_data["quote"]
        room.users = [User(user["username"]) for user in room_data["users"]]
        
        # Restore WPM values
        for user, user_data in zip(room.users, room_data["users"]):
            user.wpm = user_data["wpm"]
        
        rooms.append(room)

    return rooms

####################################################################
############################## ROUTES ##############################
####################################################################

@app.route('/')
def home():
    return 'Welcome to the backend!'

@app.route('/rooms/', methods=['GET'])
def getRoomList():
    rooms = load_rooms()
    return jsonify([room.getRoomSummary() for room in rooms if not room.isGameInProgress])

@app.route('/room/create', methods=['POST'])
def createRoom():
    data = request.json
    capacity = data.get('capacity')
    name = data.get('name')

    if capacity > 5:
        return jsonify({'message': 'Capacity cannot exceed 10'}), 400
    
    if capacity < 2:
        return jsonify({'message': 'Capacity cannot be less than 3'}), 400

    with lock:
        rooms = load_rooms()
        new_id = 1
        while any(room.id == new_id for room in rooms):
            new_id += 1
        newRoom = Room(new_id, capacity, name)
        rooms.append(newRoom)
        save_rooms(rooms)

    return jsonify({'room_id': newRoom.id, 'message': 'Room created successfully'}), 201

@app.route('/room/<int:room_id>', methods=['GET'])
def get_users(room_id):
    room = getRoomById(room_id)

    if room is None:
        return jsonify({'message': 'Room not found'}), 404
    
    if room.isGameInProgress:
        return jsonify({'message': 'Game already in progress'}), 409

    return room.getRoomLobby()

def get_filler():
    return {
        "content": "The quick brown fox jumps over the lazy dog",
        "anime": "None",
        "character": "Arthur F. Curtis",
    }

@app.route('/room/<int:room_id>/start', methods=['GET'])
def game_start(room_id):
    try:
        socketio.emit('start_load', to=room_id)
        headers = {"x-api-key": API_KEY}
        response = requests.get(API_BASE_URL, headers=headers)
        data = response.json()

        if "message" in data:
            return "", 200
        
        quote = {
            "content": data["data"]["content"],
            "anime": data["data"]["anime"]["name"],
            "character": data["data"]["character"]["name"],
        }

        room = getRoomById(room_id)
        room.quote = quote
        room.startGame()
        threading.Timer(300, lambda: remove_room(room)).start()
        
        socketio.emit('game_start' , to=room_id)
        return "", 200
    except Exception as e:
        print(f"Error fetching quote: {e} for room {room_id}")
        return "", 500

@app.route('/room/<int:room_id>/content', methods=['GET'])
def get_quote(room_id):
    try:
        quote = getRoomById(room_id).quote
        return jsonify(quote), 200
    except Exception as e:
        print(f"Error getting content: {e} for room {room_id}")
        return "", 500

def remove_room(room: Room):
    rooms = load_rooms()
    rooms.remove(room)
    save_rooms(rooms)

####################################################################
######################## SOCKETS ########################
####################################################################

disconnect_grace_period = 2
disconnect_timers = {}

@socketio.on('join')
def on_join(data):
    username = data['username']
    room_id = int(data['room_id'])
    user = User(username)
    print(username, 'joined')

    room = getRoomById(room_id)

    if room is None:
        emit('room_join_failure', {'message': 'Room not found'}, to=request.sid)
        return
    
    if room.isGameInProgress:
        emit('room_join_failure', {'message': 'Game already in progress'}, to=request.sid)
        return

    if (room_id, username) in disconnect_timers:
        disconnect_timers[(room_id, username)].cancel()
        del disconnect_timers[(room_id, username)]
    else:
        success, message = room.addUser(user)
        if success:
            join_room(room_id)
            emit('room_join_success', to=request.sid)
            emit('room_users_update', room.getRoomLobby() , to=room_id)
        else:
            emit('room_join_failure', {'message': message}, to=request.sid)
            disconnect()

@socketio.on('leave')
def on_leave(data):
    room_id = int(data['room_id'])
    username = data['username']
    print(f'User {username} left')

    room = getRoomById(room_id)
    if room is None:
        print('room doesnt even exist lol')
        return 

    room.removeUser(username)
    leave_room(room_id)
    emit('room_users_update', room.getRoomLobby() , to=room_id)
    if room.isEmpty():
        remove_room(room)

@socketio.on('connect')
def handle_connect():
    print('connected socket')

@socketio.on('disconnect')
def handle_disconnect():
    print('disconnected socket')

@socketio.on('reload')
def handle_reload(data):
    room_id = int(data['room_id'])
    username = data['username']
    print(username, 'reloaded')
    rooms = load_rooms()

    def delayed_disconnect():
        if (room_id, username) not in disconnect_timers:
            return

        for room in rooms:
            if room.id == room_id and room.hasUser(username):
                room.removeUser(username)
                socketio.emit('room_users_update', room.getRoomLobby() , to=room.id)
                if room.isEmpty():
                    remove_room(room)
                break

        del disconnect_timers[(room_id, username)]  # Clean up

    timer = Timer(disconnect_grace_period, delayed_disconnect)
    timer.start()
    disconnect_timers[(room_id, username)] = timer

@socketio.on('left_game')
def handle_left_game(data):
    room_id = int(data['room_id'])
    username = data['username']
    print(f'User {username} left the game')
    rooms = load_rooms()
    
    for room in rooms:
        if room.id == room_id and room.hasUser(username):
            room.removeUser(username)
            socketio.emit('room_users_update', room.getRoomLobby() , to=room.id)
            if room.isEmpty():
                remove_room(room)
            break

@socketio.on('finish')  # end of a game
def handle_end(data):
    room_id = int(data['room_id'])
    username = data['username']
    wpm = data['wpm']
    print(f'User {username} finished with {wpm} wpm')

    room = getRoomById(room_id)
    if room is None:
        print('room doesnt even exist lol')
        return
    
    room.setUserWpm(wpm, username)
    emit('update_leaderboard', room.getLeaderboard(), to=room_id)

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5050)
