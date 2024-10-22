FROM alpine/java:22-jdk

COPY ./overlay_tiles /overlay_tiles

RUN for city in "gothenburg" "malmo" "munich" "stockholm"; do unzip /overlay_tiles/$city.zip -d /overlay_tiles/; done
RUN find /overlay_tiles -name "*.zip" | while read filename; do unzip -o -d "`dirname "$filename"`" "$filename"; done;

COPY ./build/libs/*.jar app.jar
ADD ./src/main/resources /store
COPY searchAreas.json /searchAreas.json
COPY ./src/main/resources/static/ /resources/static/


ENTRYPOINT ["java","-jar","/app.jar"]