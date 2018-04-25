# Mobile Web Specialist Certification Course
---
#### _Three Stage Course Material Project - Restaurant Reviews_

The project uses yarn and gulp to execute development and build tasks.
The available scripts are:

```bash
yarn lint          # calls the gulp lint task, that will lint HTML, CSS and JS
yarn build         # calls the gulp build task, that will minify and copy the project to the dist folder
yarn serve:dev     # serves the unminified files from the src folder
yarn serve:prod    # builds the project and serves the production ready files from the dist folder
```

##### Steps to start and test the project
1. Install [Node.js](https://nodejs.org/). The latest LTS should do the work
2. Install [Yarn](https://yarnpkg.com/)
1. Fork and clone the [server repository](https://github.com/udacity/mws-restaurant-stage-2).
2. `cd` in the folder where you cloned it and start it by executing `node server.js`. The API server will be available at `http://localhost:1337`
3. Fork and clone this repository
4. `cd` into the folder where you cloned the repo and install the needed dependencies by running `yarn`
5. Run `yarn serve:prod`. The project will be available at `http://localhost:8080`. _If you need to test the project with the development, unminified files, run `yarn serve:dev` instead_
