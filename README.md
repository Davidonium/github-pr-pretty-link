# Github Pull Request Pretty Link

Browser extension to copy a link from the current active tab so that your peers can see what the Pull Request is about.



## Building

This extension can only be built on a `linux/amd64` machine.

Dependencies:
- [node/lts](https://nodejs.org/download/release/latest-v22.x/)
- [pnpm](https://pnpm.io/installation)
- [bash](https://packages.debian.org/sid/bash)
- [zip](https://packages.debian.org/sid/zip)


Run:

```bash
pnpm install
pnpm build
```

The resulting package will be under `./dist/app`.


### Packaging for release

To generate the zip package to submit to the browser extension stores, run:

```bash
pnpm package
```

The package will be under `./dist/package.zip`.
