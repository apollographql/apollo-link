# Polling Link

## Purpose
This is a WIP for abstracting the scheduler from apollo-client to allow polling to be handled by a link

## Installation

`npm install apollo-link-polling --save`


## Usage

```js
import { PollingLink } from "apollo-link-polling";

const pollingLink = new PollingLink(() => 10000);  // time in milliseconds
```