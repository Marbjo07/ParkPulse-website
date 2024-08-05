# gunicorn_config.py

import logging
import sys

# Server socket
bind = '0.0.0.0:5000'

# Workers
workers = 1

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr

# Log level
loglevel = 'info'

# Custom log format for access logs
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Configure the logger
logger = logging.getLogger('gunicorn.error')
logger.handlers = [logging.StreamHandler(sys.stdout)]