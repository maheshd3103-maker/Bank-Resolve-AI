import React, { useState } from 'react';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hello! I\'m your AI banking assistant. How can I help you today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      const userMessage = {
        id: Date.now(),
        type: 'user',
        text: inputMessage
      };
      
      setMessages(prev => [...prev, userMessage]);
      const currentMessage = inputMessage;
      setInputMessage('');
      setIsLoading(true);
      
      try {
        const userId = localStorage.getItem('user_id');
        const response = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            user_id: userId
          })
        });
        
        const data = await response.json();
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          text: data.success ? data.response : "I'm sorry, I couldn't process your request. Please try again."
        };
        
        setMessages(prev => [...prev, botResponse]);
      } catch (error) {
        console.error('Chat error:', error);
        const errorResponse = {
          id: Date.now() + 1,
          type: 'bot',
          text: "I'm having trouble connecting right now. Please try again later."
        };
        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleQuickAction = (action) => {
    setInputMessage(action);
  };

  const quickActions = [
    'Check balance',
    'Transfer money',
    'Pay bills',
    'Apply for loan',
    'Block card',
    'Find ATM'
  ];

  return (
    <div className="feature-container">
      <h2>AI Banking Assistant</h2>
      
      <div className="ai-chat-container">
        <div className="chat-messages">
          {messages.map(message => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                {message.type === 'bot' && <span className="bot-icon">🤖</span>}
                <span className="message-text">{message.text}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="quick-actions-section">
          <h4>Quick Actions</h4>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <button key={index} className="quick-action-btn" onClick={() => handleQuickAction(action)}>
                {action}
              </button>
            ))}
          </div>
        </div>
        
        <form onSubmit={handleSendMessage} className="chat-input-form">
          <div className="chat-input-container">
            <input 
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message or ask a question..."
              className="chat-input"
            />
            <button type="submit" className="send-btn" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;