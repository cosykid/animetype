import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "./socket"

const API_URL = import.meta.env.VITE_API_URL;

const Room = ({ username } : { username: string } ) => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isGameLoading, setIsGameLoading] = useState<boolean>(false);
  const nameRef = useRef<string | null>(null);
  const capacityRef = useRef<number | null>(null);

  const handleRoomData = (data: { userList: string[], name: string, capacity: number, owner: string }) => {
    setPlayers(data.userList);
    setIsOwner(data.owner == username)
    nameRef.current = data.name;
    capacityRef.current = data.capacity;
  };

  const fetchUserList = async () => {
    try {
      const response = await fetch(`${API_URL}/room/${roomId}`);
      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.statusText}`);
      }
      const data = await response.json();
      handleRoomData(data);
    } catch (error) {
      navigate("/")
      console.error('Error fetching user list:', error);
    }
  };

  const handleBeforeUnload = () => {
    socket.emit("reload", { 'room_id': roomId, 'username': username });
  }

  useEffect(() => {
    if (!roomId) return;
    sessionStorage.setItem("roomId", roomId);
    
    fetchUserList();
    socket.on("room_users_update", handleRoomData);
    socket.once("game_start", handleLoadGame);
    socket.once("start_load", () => setIsGameLoading(true));

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.off("room_users_update");
      socket.off("game_start");
      socket.off("start_load");
    };
  }, []); 

  const handleLeaveRoom = () => {
    socket.emit("leave", { 'room_id': roomId, 'username': username });
    sessionStorage.removeItem("roomId");
    navigate("/join-room");
  };

  const handleStartGame = async () => {
    setIsGameLoading(true);
    socket.emit('start', {'room_id': roomId });

    try {
      const response = await fetch(`${API_URL}/room/${roomId}/start`);
  
      if (!response.ok) {
        setIsGameLoading(false);
        throw new Error(`Failed to start game: ${response.statusText}`);
      }
      setIsGameLoading(false);
      handleLoadGame(); // Navigate to the game if successful
    } catch (error) {
      alert('Failed to start game');
      console.error("Error starting game:", error);
    }

    setIsGameLoading(false);
  };

  const handleLoadGame = () => {
    navigate(`/room/${roomId}/game`);
  }

  return (
    <div>
      <h1>{nameRef.current}</h1>
      <h2>Players ({players.length}/{capacityRef.current}):</h2>
      <ul style={{'display': 'grid', 'justifyItems': 'center'}}>
        {players.map((name, index) => (
          <li key={index} className="player-list">{name}</li>
        ))}
      </ul>
      {isOwner && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
      <button onClick={handleLeaveRoom}>Leave Room</button>
      {isGameLoading ? (<p>Loading game...</p>) : <></>}
    </div>
  );
};

export default Room;
