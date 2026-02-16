# Use official Nginx image as the base
FROM nginx:alpine

# Cloud Run requires the container to listen on the port defined by the PORT environment variable.
# The official Nginx image supports environment variable substitution in templates matching *.template 
# placed in /etc/nginx/templates/
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Copy the static web application files to the Nginx html directory
COPY . /usr/share/nginx/html

# Ensure the Nginx entrypoint only substitutes the PORT variable
# This prevents it from accidentally replacing Nginx variables like $uri
ENV NGINX_ENVSUBST_FILTER=PORT

# The standard Nginx image's entrypoint will automatically handle the envsubst 
# and move the resulting file to /etc/nginx/conf.d/default.conf
