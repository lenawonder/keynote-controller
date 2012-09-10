Node.js Keynote Controller
==============================

npm install

In Keynote, export to HTML. Copy the Keynote files (assets/ directory and index.html file) to the public/ directory (leave the js/ directory in there at all times).

To update your presentation, remove the assets/ directory and index.html file from public/ and export to HTML again in Keynote. Add your newly exported files to public/

Run with

      node server


The first client that connects to the server will be the controller. All clients that connect after that will be viewers. Currently only the left arrow, right arrow and space bar keys are recognized as control events to be sent to the viewers (i.e. clicking the slide will also advance the slides but won't advance all the viewers' slides).