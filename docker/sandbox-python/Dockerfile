FROM python:3.12-alpine

# Create non-root user and group
RUN addgroup -g 10001 -S sandbox && \
    adduser -u 10001 -S sandbox -G sandbox

# Working directory on tmpfs
WORKDIR /tmp

USER sandbox:sandbox

CMD ["python", "-u", "/tmp/code.py"]
