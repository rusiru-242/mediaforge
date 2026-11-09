# MediaForge — Architecture Workflows

**Document Version:** 1.0.0
**Last Updated:** 2026-11-09

---

## Online Conversion Workflow

```
1. User uploads file → POST /api/v1/convert/upload
2. Backend validates MIME type, size, extension
3. File stored temporarily (inputKey)
4. User configures options → POST /api/v1/convert/start
5. Job created in DB (status: QUEUED)
6. Job pushed to Redis queue (LPUSH)
7. 202 Accepted { jobId } returned to client
8. Client opens WebSocket /ws/jobs/{jobId}
9. Worker BRPOP from Redis queue
10. Worker updates job status to PROCESSING
11. Worker downloads input file from storage
12. Worker builds FFmpeg command
13. Worker spawns FFmpeg process (stdout: -progress pipe:1)
14. Worker parses progress tokens, publishes to Redis Pub/Sub
15. API subscribes to channel, forwards to WebSocket client
16. FFmpeg completes (exit 0)
17. Worker uploads output file to storage (outputKey)
18. Worker updates job in DB (status: COMPLETED, outputKey, expiresAt)
19. Worker publishes COMPLETED event
20. API sends download link to client via WebSocket
21. Client displays download button
22. User clicks download → GET /api/v1/files/{id}/download
23. API generates signed URL → 302 redirect to storage
24. File downloaded
25. Scheduled cleanup task deletes file after TTL
```

## GitHub Branching Workflow

```
1. Create feature branch from develop
   git checkout develop && git pull origin develop
   git checkout -b feat/feature-name

2. Develop and commit using Conventional Commits
   git commit -m "feat(scope): description"

3. Push branch
   git push -u origin feat/feature-name

4. Create PR → develop on GitHub

5. CI pipeline runs (lint, test, build)

6. Peer review (1+ approval)

7. Squash and merge to develop

8. Delete feature branch

9. For releases: PR develop → main
   - 2 approvals required
   - Full CI must pass

10. Tag release
    git tag -a v1.0.0 -m "Release v1.0.0"
    git push origin v1.0.0
```
