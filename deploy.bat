@echo off
SETLOCAL EnableDelayedExpansion
SET SERVICE_NAME=rice-pasta-timer
SET REGION=me-west1
SET PROJECT_ID=gen-lang-client-0026629090

echo ====================================================
echo   Rice and Pasta Timer - Robust Cloud Run Deployment
echo ====================================================
echo.

:: Get latest version from README or internal file
set VERSION=1.81

:: Format version for Cloud Run (replace dots with dashes, e.g. 1.81 -> 1-81)
set SAFE_VERSION=%VERSION:.=-%

echo Project: %PROJECT_ID%
echo Service: %SERVICE_NAME%
echo Region:  %REGION%
echo Version: %VERSION% (Suffix: v%SAFE_VERSION%)
echo.

echo [1/3] Setting project and enabling services...
call gcloud config set project %PROJECT_ID% --quiet

echo Enabling required Google APIs...
call gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --quiet

echo.
echo [2/3] Preparing deployment...
echo Ensuring Artifact Registry repo exists...
call gcloud artifacts repositories create cloud-run-source-lib --repository-format=docker --location=%REGION% --quiet 2>nul || echo Repository already exists or error ignored.

echo.
echo [3/3] Deploying to Cloud Run...
echo This will build the container and deploy. Please wait...
echo.

call gcloud run deploy %SERVICE_NAME% ^
  --source . ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --revision-suffix=v%SAFE_VERSION% ^
  --quiet

if %ERRORLEVEL% equ 0 (
    echo.
    echo SUCCESS! Your Rice and Pasta Timer is now live.
) else (
    echo.
    echo ERROR: Deployment failed. Please check the messages above.
)

echo.
echo ====================================================
echo   Deployment Process Finished
echo ====================================================
pause
