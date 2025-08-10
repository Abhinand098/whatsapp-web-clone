import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client"; // ✅ WebSocket client
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"; // ✅ Use env var for backend URL
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000"; // ✅ Use env var for Socket.IO
  // Connect to WebSocket on mount
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    // When new message is broadcast
    socketRef.current.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // When message status is updated
    socketRef.current.on("messageUpdated", (updated) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updated._id ? updated : msg))
      );
    });

    // Cleanup socket on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, [SOCKET_URL]);

  // Fetch messages on load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedChat]);

  useEffect(() => {
    const appElement = document.querySelector(".app");
    if (selectedChat) {
      appElement.classList.add("chat-open");
    } else {
      appElement.classList.remove("chat-open");
    }
  }, [selectedChat]);

  const fetchMessages = () => {
    axios
      .get(`${API_URL}/messages`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));
  };

  // Group messages by wa_id
  const chats = messages.reduce((acc, msg) => {
    if (!acc[msg.wa_id]) acc[msg.wa_id] = [];
    acc[msg.wa_id].push(msg);
    return acc;
  }, {});

  // Handle sending message
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;

    const chat = chats[selectedChat][0];
    axios
      .post(`${API_URL}/messages`, {
        wa_id: chat.wa_id,
        name: chat.name,
        message: newMessage,
        status: "me",
        sender: "me"
      })
      .then(() => {
        setNewMessage("");
      })
      .catch((err) => console.error(err));
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>Whatsapp</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search or start new chat"
            onChange={(e) => console.log("Searching:", e.target.value)}
          />
        </div>
        {Object.keys(chats).map((wa_id) => {
          const lastMsg = chats[wa_id][chats[wa_id].length - 1];
          return (
            <div
              key={wa_id}
              className={`chat-item ${selectedChat === wa_id ? "active" : ""}`}
              onClick={() => setSelectedChat(wa_id)}
            >
              <div className="chat-avatar">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                    chats[wa_id][0].name
                  )}`}
                  alt="avatar"
                />
              </div>
              <div className="chat-info">
                <strong>{chats[wa_id][0].name}</strong>
                <p>{lastMsg.message}</p>
              </div>
              <div className="chat-time">{formatTime(lastMsg.timestamp)}</div>
            </div>
          );
        })}
      </div>

      {/* Chat Window */}
      <div className="chat-window">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <button className="md:hidden" onClick={() => setSelectedChat(null)}>
                ←
              </button>
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  chats[selectedChat][0].name
                )}`}
                alt="avatar"
              />
              <h3>{chats[selectedChat][0].name}</h3>
              <div>
              <p className="chat-number">{selectedChat}</p>
              </div>
            </div>
            <div className="messages">
              {chats[selectedChat].map((msg, index) => (
                <div
                  key={index}
                  className={`message-bubble ${
                    msg.sender === "me" ? "outgoing" : "incoming"
                  }`}
                >
                  {msg.sender !== "me" && (
                    <img
                      className="message-avatar"
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                        msg.name
                      )}`}
                      alt="avatar"
                    />
                  )}
                  <div className="bubble-content">
                    <p>{msg.message}</p>
                    <span className="time">
                      {formatTime(msg.timestamp)}
                      {msg.sender === "me" && (
                        <>
                          {msg.status === "sent" && "✓"}
                          {msg.status === "delivered" && "✓✓"}
                          {msg.status === "read" && (
                            <span className="text-blue-500">✓✓</span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}></div>
            </div>
            <div className="message-input">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <p className="no-chat">Select a chat to view messages</p>
        )}
      </div>
    </div>
  );
}

export default App;
