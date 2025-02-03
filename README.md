# Github Pull Request Pretty Link

Browser extension to copy a link from the current active tab so that your peers can see what the Pull Request is about.



## Building

This extension is built on a `linux/amd64` machine. If dependencies are replicated, it can be possible to build it in other
OSes or architecture combinations.

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
