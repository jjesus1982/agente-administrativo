"""
Gunicorn Configuration for Production
Conecta Plus API
"""
import multiprocessing
import os

# Server socket
bind = os.getenv("GUNICORN_BIND", "0.0.0.0:8100")
backlog = 2048

# Worker processes
# Recomendacao: 2-4 workers por CPU core
# Formula: (2 x num_cores) + 1
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 10000  # Reinicia worker apos N requests (previne memory leaks)
max_requests_jitter = 1000  # Adiciona variacao para evitar restart simultaneo

# Timeouts
timeout = 120  # Segundos para processar request
graceful_timeout = 30  # Tempo para graceful shutdown
keepalive = 5  # Segundos para manter conexao keep-alive

# Process naming
proc_name = "conecta-plus-api"

# Server mechanics
daemon = False  # Nao rodar como daemon (Docker precisa foreground)
pidfile = None
user = None
group = None
tmp_upload_dir = None

# Logging
errorlog = "-"  # Envia para stderr (Docker captura)
accesslog = "-"  # Envia para stdout (Docker captura)
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# SSL (se necessario, configurar via proxy reverso como Nginx)
# keyfile = None
# certfile = None

# Hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    pass

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    pass

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    pass

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    pass

def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    pass

def worker_abort(worker):
    """Called when a worker receives SIGABRT."""
    pass

def pre_exec(server):
    """Called just before a new master process is forked."""
    pass

def when_ready(server):
    """Called just after the server is started."""
    pass

def worker_exit(server, worker):
    """Called just after a worker has been exited, in the master process."""
    pass

def nworkers_changed(server, new_value, old_value):
    """Called when number of workers changed."""
    pass

def child_exit(server, worker):
    """Called just after a worker has been exited, in the worker process."""
    pass
