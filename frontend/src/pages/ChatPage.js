import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const WS_BASE = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');

export default function ChatPage() {
  const { convId } = useParams();
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(convId || null);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/conversations`, { headers: getAuthHeaders(), withCredentials: true });
      setConversations(data);
    } catch {}
    finally { setLoading(false); }
  }, [getAuthHeaders]);

  const fetchMessages = useCallback(async (cId) => {
    try {
      const { data } = await axios.get(`${API}/conversations/${cId}/messages`, { headers: getAuthHeaders(), withCredentials: true });
      setMessages(data);
    } catch {}
  }, [getAuthHeaders]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv);
      // Connect WebSocket
      const token = localStorage.getItem('token');
      if (token) {
        const ws = new WebSocket(`${WS_BASE}/api/ws/chat/${activeConv}?token=${token}`);
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        };
        ws.onerror = () => {};
        wsRef.current = ws;
        return () => { ws.close(); };
      }
    }
  }, [activeConv, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv) return;
    try {
      await axios.post(`${API}/conversations/${activeConv}/messages`, { content: newMsg }, { headers: getAuthHeaders(), withCredentials: true });
      setNewMsg('');
      fetchMessages(activeConv);
    } catch {}
  };

  const getOtherName = (conv) => {
    if (!user) return '';
    return conv.user1_id === user.id ? conv.user2_name : conv.user1_name;
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex max-w-7xl mx-auto w-full" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Sidebar */}
        <div className={`${activeConv && 'hidden md:block'} w-full md:w-80 border-r-4 border-black bg-white overflow-y-auto`}>
          <div className="p-4 border-b-2 border-black">
            <h2 className="font-heading text-xl font-bold uppercase">Messages</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={24} /></div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No conversations yet. Start chatting from a product page!</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                data-testid={`conv-${conv.id}`}
                onClick={() => { setActiveConv(conv.id); navigate(`/chat/${conv.id}`); }}
                className={`w-full text-left p-4 border-b-2 border-black hover:bg-yellow-50 transition-colors ${activeConv === conv.id ? 'bg-yellow-100' : ''}`}
              >
                <p className="font-bold text-sm truncate">{getOtherName(conv)}</p>
                <p className="text-xs text-gray-500 truncate">{conv.last_message || 'No messages yet'}</p>
              </button>
            ))
          )}
        </div>

        {/* Chat Area */}
        <div className={`${!activeConv && 'hidden md:flex'} flex-1 flex flex-col`}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b-2 border-black bg-white flex items-center gap-3">
                <button onClick={() => { setActiveConv(null); navigate('/chat'); }} className="md:hidden border-2 border-black p-1">
                  <ArrowLeft size={16} />
                </button>
                <h3 className="font-bold text-sm uppercase">
                  {conversations.find(c => c.id === activeConv) ? getOtherName(conversations.find(c => c.id === activeConv)) : 'Chat'}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FEF9E1]">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div
                      data-testid={`msg-${msg.id}`}
                      className={`max-w-[75%] p-3 border-2 border-black ${
                        msg.sender_id === user.id
                          ? 'bg-black text-white'
                          : 'bg-white text-black'
                      }`}
                    >
                      <p className="text-xs font-bold mb-1 opacity-70">{msg.sender_name}</p>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-[10px] mt-1 opacity-50">{new Date(msg.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-3 border-t-2 border-black bg-white flex gap-2">
                <input
                  data-testid="chat-input"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50"
                />
                <button
                  data-testid="chat-send-btn"
                  type="submit"
                  className="bg-yellow-400 border-2 border-black px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#FEF9E1]">
              <div className="text-center">
                <p className="font-heading text-2xl font-bold uppercase mb-2">Select a Conversation</p>
                <p className="text-gray-500 text-sm">Choose from the list or start one from a product page</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
