import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  username: string;
  setUsername: (name: string) => void;
}

const Home = ({ username, setUsername } : Props) => {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (input.trim()) {
      setUsername(input);
      sessionStorage.setItem("username", input);
    } else {
      alert("Please enter a valid username.");
    }
  };

  return (
    <div className="page">
      {!username ? (
        <div>
          <h1>Animetype</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your name"
            />
            <button type="submit">&rarr;</button>
          </form>
        </div>
      ) : (
        <div>
          <h1>Welcome, {username}!</h1>
          <button onClick={() => navigate("/create-room")}>Create a Room</button>
          <button onClick={() => navigate("/join-room")}>Join a Room</button>
        </div>
      )}
    </div>
  );
};

export default Home;
