from src.user import User
from typing import List
import threading

class Room:
    def __init__(self, id: int, capacity: int, name: str):
        self.id = id
        self.capacity = capacity
        self.name = name
        self.users: List[User] = []
        self.lock = threading.Lock()
        self.isGameInProgress = False
        self.owner = ''
        self.quote = None
    
    def removeUser(self, username: str):
        with self.lock:
            for user in self.users:
                if user.username == username:
                    self.users.remove(user)
                    if not self.isEmpty():
                        self.owner = self.users[0].username
                        print('owner is now', self.owner)
                    break
    
    def addUser(self, user: User) -> tuple:
        with self.lock:
            if len(self.users) >= self.capacity:
                return False, 'Room is full'
            
            if self.isGameInProgress:
                return False, 'Game is already in progress'

            for existing_user in self.users:
                if existing_user.username == user.username:
                    return False, 'Another user exists with the same name. Please try again with a different name.'
                
            if not self.users:
                self.owner = user.username

            self.users.append(user)
            return True, None
        
    def startGame(self):
        with self.lock:
            if self.isGameInProgress:
                return
            self.isGameInProgress = True
    
    def endGame(self):
        self.isGameInProgress = False

    def isEmpty(self):
        return not self.users
    
    def hasUser(self, username: str) -> bool:
        return any(user.username == username for user in self.users)

    # Returns details required to display the list of rooms
    def getRoomSummary(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "capacity": self.capacity,
            "userCount": len(self.users)
        }
    
    def setUserWpm(self, wpm: int, username: str):
        for user in self.users:
            if user.username == username:
                user.wpm = wpm
                print(f"Updated WPM for {username}: {wpm}")
                return
        print(f"User {username} not found.")
    
    # Returns details required to display the room in lobby
    def getRoomLobby(self) -> dict:
        return {
            'name': self.name,
            'userList': self.getUserList(), 
            'capacity': self.capacity,
            'owner': self.owner
        }
    
    def getLeaderboard(self) -> dict:
        sorted_users = sorted(self.users, key=lambda user: user.wpm, reverse=True)
        return [{'username': user.username, 'wpm': user.wpm} for user in sorted_users]
    
    def getUserList(self) -> List[str]:
        with self.lock:
            return [user.username for user in self.users]
