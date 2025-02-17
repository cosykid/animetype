import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "./socket"

const API_URL = import.meta.env.VITE_API_URL;

interface Room {
  id: number;
  name: string;
  capacity: number;
  userCount: number;
}

export const handleJoinRoom = (
  username: string,
  roomId: number,
  navigate: Function,
  fetchRooms: Function,
) => {
  const timeout = setTimeout(() => {
    console.log("No response from server. Cleaning up listeners.");
    socket.off("room_join_success", successHandler);
    socket.off("room_join_failure", failureHandler);
  }, 3000);
  
  const successHandler = () => {
    clearTimeout(timeout);
    socket.off("room_join_failure", failureHandler);
    navigate(`/room/${roomId}`);
  };

  const failureHandler = (data: { message: string }) => {
    alert(data.message);
    clearTimeout(timeout);
    socket.off("room_join_success", successHandler);
    fetchRooms();
  };

  socket.once("room_join_success", successHandler);
  socket.once("room_join_failure", failureHandler);

  socket.emit("join", { 'room_id': roomId, 'username': username });
};

const JoinRoom = ({ username }:  { username: string }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const navigate = useNavigate();

  // Function to fetch rooms
  const fetchRooms = async () => {
    const response = await fetch(`${API_URL}/rooms/`);
    const data = await response.json();
    setRooms(data);
  };

  // Initial room fetch when component is mounted
  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="page">
      <h1>Join a Room</h1>
      
      {rooms.length > 0 ? (
        <ul>
          {rooms.map((room) => (
            <li key={room.id} className="room-list">
              {room.name} ({room.userCount}/{room.capacity})
              <button className="join-button"
                onClick={() => handleJoinRoom(username, room.id, navigate, fetchRooms)}
              >Join</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No active rooms available.</p>
      )}

      <div>
        <button onClick={() => navigate('/')}>Back</button>
        <button
          onClick={fetchRooms}
          className="refresh-button"
        >
          Refresh Rooms
        </button>
      </div>
    </div>
  );
};

export default JoinRoom;
