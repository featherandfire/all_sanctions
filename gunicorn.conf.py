# Gunicorn configuration for all_sanctions
# ─────────────────────────────────────────
# Single sync worker: L1 (_entity_cache) stays warm across requests with no
# inter-process memory duplication. preload_app=False keeps the master process
# lightweight — no entity data loaded until a real request arrives.

# 1 worker — sufficient for this workload; avoids duplicating large in-memory
# entity caches across processes (which caused OOM on small EC2 instances).
workers = 1

worker_class = "sync"

# Allow up to 3 minutes for a single request (worst-case cold L3 fetch)
timeout = 180

graceful_timeout = 30

keepalive = 5

bind = "0.0.0.0:5001"

accesslog = "-"
errorlog  = "-"
loglevel  = "info"

# Do NOT preload — let the single worker own its own memory space cleanly.
# preload_app=True caused OOM: master loaded all entity records, then forked
# workers copied pages via CoW, tripling memory usage on restart.
preload_app = False
