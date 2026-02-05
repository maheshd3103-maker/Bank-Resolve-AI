import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import '../styles/AIAssistant.css';

const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI banking assistant. I can help you with banking policies, transaction issues, and general questions. How can I assist you today?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        message: userMessage,
        user_id: user?.id,
      });

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    'What is your refund policy?',
    'How long does a transfer take?',
    'What should I do if my transaction failed?',
    'Tell me about KYC requirements',
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
  };

  return (
    <>
      <Navbar />
      <div className="ai-assistant-container">
        <div className="chat-container">
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="ai-avatar">
                <Bot size={28} />
              </div>
              <div>
                <h1 className="chat-title">AI Banking Assistant</h1>
                <p className="chat-subtitle">Powered by RAG & LangGraph</p>
              </div>
            </div>
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span>Online</span>
            </div>
          </div>

          <div className="messages-container">
            {messages.map((message, index) => (
              <div key={index} className={`message message-${message.role}`}>
                <div className="message-avatar">
                  {message.role === 'assistant' ? <Bot size={20} /> : <UserIcon size={20} />}
                </div>
                <div className="message-content">
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message message-assistant">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-content typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="quick-questions">
              <p className="quick-questions-title">Quick questions:</p>
              <div className="quick-questions-grid">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="quick-question-btn"
                    onClick={() => handleQuickQuestion(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="chat-input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="chat-input"
              disabled={loading}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!inputMessage.trim() || loading}
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        <div className="sidebar-info">
          <div className="info-card-ai">
            <h3>🤖 AI Features</h3>
            <ul>
              <li>RAG-powered knowledge base</li>
              <li>Policy and procedure queries</li>
              <li>Transaction issue resolution</li>
              <li>24/7 intelligent assistance</li>
            </ul>
          </div>
          <div className="info-card-ai">
            <h3>💡 Tips</h3>
            <ul>
              <li>Be specific with your questions</li>
              <li>Provide transaction IDs when relevant</li>
              <li>Ask about policies and procedures</li>
              <li>Get instant answers anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;

