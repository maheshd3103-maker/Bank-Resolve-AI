# 🚀 **REDIS + BACKGROUND JOBS SETUP**

## **Prerequisites:**

### 1. Install Redis for Windows
```bash
# Download Redis from:
https://github.com/microsoftarchive/redis/releases

# Or use Chocolatey:
choco install redis-64

# Or use WSL:
wsl --install
sudo apt update
sudo apt install redis-server
```

### 2. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

## **🔥 STARTUP SEQUENCE:**

### Terminal 1: Start Redis Server
```bash
# Windows (if installed):
redis-server

# Or double-click:
start_redis.bat
```

### Terminal 2: Start Celery Worker
```bash
# From project root:
start_celery.bat

# Or manually:
cd backend
celery -A tasks worker --loglevel=info --pool=solo
```

### Terminal 3: Start Flask Backend
```bash
cd backend
python app.py
```

### Terminal 4: Start React Frontend
```bash
cd frontend
npm start
```

## **✅ TESTING THE WORKFLOW:**

1. **Login to BankSecure AI**
2. **Go to Transfer tab**
3. **Fill transfer form:**
   - Receiver Name: Any name
   - Account: Use any from external_accounts table
   - Bank: Select any bank
   - Amount: ₹1000+
4. **Click "Send Money"**
5. **Watch real-time processing:**
   - Shows "Processing..." with spinner
   - Takes 4-5 seconds (realistic delay)
   - Shows SUCCESS/FAILED result
6. **For failed transactions:**
   - Click "Raise Complaint" 
   - See AI root cause analysis
   - Auto-refund for network issues

## **🎯 EXPECTED BEHAVIOR:**

### **Success Flow (60%):**
```
Processing... → 4 seconds → ✅ Success → Balance updated
```

### **Failure Flow (40%):**
```
Processing... → 4 seconds → ❌ Failed → Complaint button → AI analysis
```

### **Error Codes You'll See:**
- **U17**: Receiver bank down → Auto-refund
- **N05**: Network timeout → Auto-refund  
- **B03**: Account mismatch → Manual review
- **F29**: Fraud detected → Escalation
- **R01**: Switch declined → Manual review
- **D52**: Insufficient balance → Auto-refund

## **🔍 MONITORING:**

### Check Redis Queue:
```bash
redis-cli
> LLEN banking_tasks
> LRANGE banking_tasks 0 -1
```

### Check Celery Status:
```bash
celery -A tasks status
```

### Check Database:
```sql
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;
SELECT * FROM complaints ORDER BY created_at DESC LIMIT 5;
```

## **🚨 TROUBLESHOOTING:**

### Redis Connection Error:
- Make sure Redis server is running
- Check port 6379 is available
- Try: `redis-cli ping` (should return PONG)

### Celery Worker Not Starting:
- Use `--pool=solo` for Windows
- Check Redis connection
- Restart Redis server

### Tasks Not Processing:
- Check Celery worker logs
- Verify Redis queue: `redis-cli LLEN banking_tasks`
- Restart Celery worker

Your **BankSecure AI** now has **production-grade transaction processing** with Redis queues and background jobs! 🎉