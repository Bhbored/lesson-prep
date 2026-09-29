FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS build
WORKDIR /src
COPY LessonPrep.Api.csproj ./
RUN dotnet restore -r linux-x64
COPY . ./
RUN dotnet publish -c Release -r linux-x64 --self-contained false --no-restore -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
# The matching headless OpenCV runtime avoids GTK/FFmpeg. Paddle needs OpenMP.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out ./
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
USER $APP_UID
# Railway injects PORT. exec delivers termination signals directly to dotnet.
ENTRYPOINT ["/bin/sh", "-c", "exec dotnet LessonPrep.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
