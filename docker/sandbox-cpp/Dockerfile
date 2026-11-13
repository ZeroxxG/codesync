FROM alpine:3.20

RUN apk add --no-cache g++ libstdc++ && \
    addgroup -g 10001 -S sandbox && \
    adduser -u 10001 -S sandbox -G sandbox

COPY run_cpp.sh /usr/local/bin/run_cpp.sh
RUN chmod +x /usr/local/bin/run_cpp.sh

WORKDIR /tmp

USER sandbox:sandbox

CMD ["/usr/local/bin/run_cpp.sh"]
