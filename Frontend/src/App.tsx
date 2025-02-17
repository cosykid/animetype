import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from './Home'
import CreateRoom from "./CreateRoom";
import JoinRoom from "./JoinRoom";
import Room from "./RoomLobby";
import Game from "./Game";
import { socket } from "./socket"

const App = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRoomId = sessionStorage.getItem("roomId");
    const storedUsername = sessionStorage.getItem("username");

    if (storedUsername) {
      setUsername(storedUsername);
    }

    if (storedRoomId && storedUsername) {
      socket.emit("join", { 'room_id': storedRoomId, 'username': storedUsername });
    }

    setLoading(false);
  }, []);

  if (loading) return null;

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Home username={username} setUsername={setUsername} />}
        />
        <Route 
          path="/create-room" 
          element={username ? <CreateRoom username={username} /> : <Navigate to="/" />} 
        />
        <Route
          path="/join-room"
          element={username ? <JoinRoom username={username} /> : <Navigate to="/" />}
        />
        <Route 
          path="/room/:roomId"
          element={username ? <Room username={username}/> : <Navigate to="/" />} 
        />
        <Route 
          path="/room/:roomId/game"
          element={username ? <Game username={username}/> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
};

export default App;
