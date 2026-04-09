# Testing Guide - Phase 2

This guide will help you test all the implemented features.

## Prerequisites

1. Backend server running on `http://localhost:3000`
2. Database seeded with sample data
3. Docker installed and running (for code execution)

## Setup

```bash
# Start infrastructure
docker-compose up -d

# Build code execution images
cd docker/executor
docker build -t code-executor-python ./python
docker build -t code-executor-javascript ./javascript
docker build -t code-executor-java ./java
docker build -t code-executor-cpp ./cpp
cd ../..

# Start backend
cd backend
npm run dev
```

## Test Scenarios

### 1. Authentication

#### Register a new candidate
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Test123!",
    "fullName": "John Doe",
    "role": "candidate"
  }'
```

#### Login as admin
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

Save the token from response for subsequent requests.

### 2. Questions Management (Admin Only)

#### Create a question
```bash
curl -X POST http://localhost:3000/api/v1/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Reverse a String",
    "description": "Write a function that reverses a string",
    "difficulty": "easy",
    "timeLimit": 1000,
    "memoryLimit": 256,
    "sampleInput": "hello",
    "sampleOutput": "olleh",
    "tags": ["strings", "easy"],
    "testCases": [
      {
        "input": "hello",
        "expectedOutput": "olleh",
        "isHidden": false,
        "points": 50
      },
      {
        "input": "world",
        "expectedOutput": "dlrow",
        "isHidden": true,
        "points": 50
      }
    ]
  }'
```

#### List all questions
```bash
curl -X GET "http://localhost:3000/api/v1/questions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get question by ID
```bash
curl -X GET http://localhost:3000/api/v1/questions/QUESTION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Assessments Management (Admin Only)

#### Create an assessment
```bash
curl -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Junior Developer Assessment",
    "description": "Basic coding skills test",
    "duration": 60,
    "passingScore": 60,
    "allowedLanguages": ["python", "javascript"],
    "instructions": "Solve all problems within the time limit",
    "questions": [
      {
        "questionId": "QUESTION_ID_1",
        "points": 100
      }
    ]
  }'
```

#### List assessments
```bash
curl -X GET "http://localhost:3000/api/v1/assessments?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Assign assessment to candidates
```bash
curl -X POST http://localhost:3000/api/v1/assessments/ASSESSMENT_ID/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userIds": ["CANDIDATE_USER_ID"]
  }'
```

### 4. Taking an Assessment (Candidate)

#### Get my assessments
```bash
curl -X GET http://localhost:3000/api/v1/assessments/my \
  -H "Authorization: Bearer YOUR_CANDIDATE_TOKEN"
```

#### Start an assessment
```bash
curl -X POST http://localhost:3000/api/v1/assessments/user-assessments/USER_ASSESSMENT_ID/start \
  -H "Authorization: Bearer YOUR_CANDIDATE_TOKEN"
```

### 5. Code Execution

#### Run code (test without submission)
```bash
curl -X POST http://localhost:3000/api/v1/submissions/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "language": "python",
    "code": "print(input()[::-1])",
    "input": "hello"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "output": "olleh",
    "error": null,
    "executionTime": 245,
    "memoryUsed": 0,
    "success": true,
    "timedOut": false
  }
}
```

#### Submit code for evaluation
```bash
curl -X POST http://localhost:3000/api/v1/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CANDIDATE_TOKEN" \
  -d '{
    "userAssessmentId": "USER_ASSESSMENT_ID",
    "questionId": "QUESTION_ID",
    "language": "python",
    "code": "print(input()[::-1])"
  }'
```

#### Get submission result
```bash
curl -X GET http://localhost:3000/api/v1/submissions/SUBMISSION_ID \
  -H "Authorization: Bearer YOUR_CANDIDATE_TOKEN"
```

#### Get submission history
```bash
curl -X GET http://localhost:3000/api/v1/submissions/history \
  -H "Authorization: Bearer YOUR_CANDIDATE_TOKEN"
```

### 6. Complete Assessment Flow

#### Submit assessment
```bash
curl -X POST http://localhost:3000/api/v1/assessments/user-assessments/USER_ASSESSMENT_ID/submit \
  -H "Authorization: Bearer YOUR_CANDIDATE_TOKEN"
```

## Sample Code Solutions

### Python - Two Sum
```python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Read input
import json
nums = json.loads(input())
target = int(input())
result = two_sum(nums, target)
print(json.dumps(result))
```

### JavaScript - Two Sum
```javascript
function twoSum(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);
    }
    return [];
}

// Read input
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const lines = [];
rl.on('line', (line) => {
    lines.push(line);
}).on('close', () => {
    const nums = JSON.parse(lines[0]);
    const target = parseInt(lines[1]);
    const result = twoSum(nums, target);
    console.log(JSON.stringify(result));
});
```

## Verification Checklist

- [ ] User registration works
- [ ] User login returns JWT token
- [ ] Admin can create questions
- [ ] Admin can create assessments
- [ ] Admin can assign assessments to candidates
- [ ] Candidate can view assigned assessments
- [ ] Candidate can start an assessment
- [ ] Code execution works for Python
- [ ] Code execution works for JavaScript
- [ ] Code submission creates evaluation
- [ ] Test cases are evaluated correctly
- [ ] Scores are calculated properly
- [ ] Hidden test cases are not visible to candidates
- [ ] Assessment can be submitted
- [ ] Submission history is accessible

## Troubleshooting

### Docker not available
```bash
# Check Docker status
docker --version
docker ps

# Restart Docker service
# Windows: Restart Docker Desktop
```

### Code execution fails
```bash
# Check if images are built
docker images | grep code-executor

# Rebuild images
cd docker/executor/python
docker build -t code-executor-python .
```

### Database errors
```bash
# Reset database
cd backend
npx prisma migrate reset
npm run seed
```

### Rate limiting
Wait 60 seconds or restart the server to reset rate limits.

## Next Steps

After testing Phase 2:
- Frontend implementation (React UI)
- Real-time features (WebSocket)
- Analytics dashboard
- Leaderboard system
- Advanced security features
