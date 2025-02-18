import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "./socket"

const API_URL = import.meta.env.VITE_API_URL;
// const API_URL = 'http://170.64.131.63:5050';

const handleCreateRoom = async (
  roomName: string, 
  maxPlayers: number, 
  username: string,
  navigate: Function // Receive the navigate function here
) => {
  if (!roomName.trim()) {
    alert("Room name cannot be empty.");
    return;
  }

  if (roomName.length > 16) {
    alert("Room name cannot exceed 16 characters");
    return;
  }
  console.log(API_URL);

  const response = await fetch(`${API_URL}/room/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      capacity: maxPlayers,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.log(`Failed to create room: ${errorData.message}`);
    return;
  }

  const data = await response.json();
  const roomId : number = data.room_id;
  console.log('GOOD ' + data.message);
  setTimeout(() => {socket.emit("join", { 'username': username, 'room_id': roomId })}, 1000);

  // Listen for confirmation before navigating
  socket.once("room_join_success", () => {
    navigate(`/room/${roomId}`);
  });

  socket.once("room_join_failure", (message) => {
    alert(`Cant RAH  join room: ${message.message}`);
  });
};

const CreateRoom = ({ username }:  { username: string }) => {
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(2); // Default selection
  const navigate = useNavigate(); // Now here, inside the component

  return (
    <div className="page">
      <h1>Create a Room</h1>
      <input
        type="text"
        placeholder="Room Name"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />

      <div className="max-players">
        <span>Max Players:</span>
        {[2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => setMaxPlayers(num)}
            className={num === maxPlayers ? "selected" : ""}
          >{num}</button>
        ))}
      </div>

      <div>
        <button onClick={() => handleCreateRoom(roomName, maxPlayers, username, navigate)}>
          Create Room
        </button>
        <button onClick={() => navigate('/')}>Back</button>
      </div>

      <style>
        {`
          .max-players {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 10px 0;
          }

          .max-players button {
            background: none;
            border: 2px solid transparent;
            padding: 5px 10px;
            font-size: 16px;
            cursor: pointer;
            color: black;
            opacity: 0.5;
          }

          .max-players button.selected {
            border-color: white;
            opacity: 1;
            border-radius: 4px;
          }
        `}
      </style>
    </div>
  );
};

export default CreateRoom;
