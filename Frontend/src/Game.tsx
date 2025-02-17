import { useState, useEffect } from "react";
import { useParams, useNavigate} from "react-router-dom";
import { socket } from "./socket"

const API_URL = import.meta.env.VITE_API_URL;

interface User {
  username: string;
  wpm: number;
}

const Game = ({ username }: { username: string }) => {
  const [input, setInput] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [anime, setAnime] = useState<string>('');
  const [character, setCharacter] = useState<string>('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [startTime, setStartTime] = useState<number>(0); // Track start time
  const [gameFinished, setGameFinished] = useState<boolean>(false); // Track if game is finished
  const [leaderboard, setLeaderboard] = useState<User[]>([]); // Track leaderboard
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const getQuote = async () => {
    try {
      const response = await fetch(`${API_URL}/room/${roomId}/content`);
      if (response.ok) {
        const data = await response.json();
        const normalizedContent = data.content.replace(/[“”‘’]/g, "'");
        setAnime(data.anime);
        setCharacter(data.character);
        setWords(normalizedContent.split(" "));
        setInput("");
        setCurrentWordIndex(0);
        setStartTime(Date.now()); // Set start time when quote is fetched
      }
    } catch (error) {
      console.error("Error fetching quote from backend:", error);
      alert("Something went wrong");
    }
  };

  useEffect(() => {
    getQuote();
    if (sessionStorage.getItem('roomId') != roomId) {
      navigate("/")
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      socket.off('update_leaderboard');
    };
  }, []);

  const handleBeforeUnload = () => {
    sessionStorage.removeItem('roomId')
    socket.emit("left_game", { 'room_id': roomId, 'username': username });
  }

  const handleUpdateLeaderboard = (data: User[]) => {
    setLeaderboard(data); // Update leaderboard state
  };

  const handleFinish = async (wpm: number) => {
    socket.on('update_leaderboard', handleUpdateLeaderboard);
    socket.emit('finish', { username, room_id: roomId, wpm });
    setGameFinished(true); // Set the game as finished
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentWord = words[currentWordIndex];

    if (gameFinished) return;
    
    // Last word typed
    if (currentWordIndex === words.length - 1 && value.trim() === currentWord) {
      setInput(value);
      const endTime = Date.now();
      const minutes = (endTime - startTime) / 60000;
      const wpm = Math.round(words.length / minutes);
      handleFinish(wpm);
      return;
    }

    if (value.endsWith(" ") && value.trim() === currentWord) {
      setCurrentWordIndex((prev) => prev + 1); // Move to the next word
      setInput("");
    } else if (value.length > currentWord.length) {
      return; // Prevent typing beyond word length
    } else {
      setInput(value);
    }
  };

  const renderWord = (word: string, index: number) => {
    if (index < currentWordIndex) {
      return <span key={index} className="correct">{word} </span>;
    }
    if (index === currentWordIndex) {
      return (
        <span key={index} className="current-word">
          {word.split("").map((char, i) => {
            const isCorrect = input[i] === char;
            return (
              <span
                key={i}
                className={
                  input[i] == null
                    ? "neutral"
                    : isCorrect
                    ? "correct"
                    : "incorrect"
                }
              >
                {char}
              </span>
            );
          })}
          <span> </span> {/* Add space between words */}
        </span>
      );
    }
    return <span key={index} className="neutral">{word} </span>;
  };

  const getLeaderboard = () => {
    return (
      <div id="leaderboard">
        <h2>You just typed a quote from <i>{anime}</i></h2>
        <h4>Character: {character}</h4>
        <ul>
          {leaderboard.map((user, index) => (
            <li key={index}>
              {user.username}: {user.wpm === 0 ? "waiting to finish..." : `${user.wpm} WPM`}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  

  return (
    <div id="game-page">
      {gameFinished && getLeaderboard()}
      <h2>Type the quote as fast as you can!</h2>
      <div id="quote-box">
        {words ? <p id="quote">{words.map(renderWord)}</p> : <p>Loading...</p>}
      </div>
      <input
        id="game-input"
        type="text"
        value={input}
        onChange={handleInputChange}
        placeholder="Start typing..."
        autoFocus
      />
    </div>
  );
};

export default Game;
