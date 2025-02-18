class User:
    def __init__(self, username: str):
        self.username = username
        self.wpm = 0
    def to_dict(self):
        return {
            "username": self.username,
            "wpm": self.wpm
        }

# This entire backend codebase is absolute garbage.
