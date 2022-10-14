FROM registry.access.redhat.com/ubi8/ubi:latest AS builder
WORKDIR /go/src/sippy
COPY . .
ENV PATH="/go/bin:${PATH}"
ENV GOPATH="/go"
RUN dnf module enable nodejs:16 -y && dnf install -y go make npm && make build

FROM registry.access.redhat.com/ubi8/ubi:latest AS base
RUN mkdir -p /historical-data
RUN mkdir -p /config
RUN mkdir -p /src/sippy/test/e2e/util
RUN mkdir -p /src/sippy/pkg
RUN dnf install -y go
COPY --from=builder /go/src/sippy/sippy /bin/sippy
COPY --from=builder /go/src/sippy/scripts/fetchdata.sh /bin/fetchdata.sh
COPY --from=builder /go/src/sippy/scripts/fetchdata-testgrid.sh /bin/fetchdata-testgrid.sh
COPY --from=builder /go/src/sippy/scripts/fetchdata-kube.sh /bin/fetchdata-kube.sh
COPY --from=builder /go/src/sippy/historical-data /historical-data/
COPY --from=builder /go/src/sippy/config/*.yaml /config
COPY --from=builder /go/src/sippy/go.sum /src/sippy/
COPY --from=builder /go/src/sippy/go.mod /src/sippy/
COPY --from=builder /go/src/sippy/test/e2e/* /src/sippy/test/e2e
COPY --from=builder /go/src/sippy/test/e2e/util/* /src/sippy/test/e2e/util
COPY --from=builder /go/src/sippy/pkg/* /src/sippy/pkg
ENTRYPOINT ["/bin/sippy"]
EXPOSE 8080
