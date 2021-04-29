# CHANGELOG

## 8.0.0 / 2021-04-29

* Removed need to typecast method, static and query objects (this was required to support function types)
* Update to Mongoose 5.12.0
* remove CLI options:
  - `--js` (generator depends too much on TS compiler libraries now, so using this with JS has very limited functionality. Convert type files to TS before using mongoose-tsgen moving forward)
  - `--augment` (added much unnecessary complexity, functionality can be achieved using a simple user-created file)
  - `--no-func-types` (this was mainly used to avoid using TS compiler API when running the generator. These days the generator depends on the TS compiler API for all basic functions so this option has no use)
* Use [new Mongoose type updates & fixes](https://github.com/Automattic/mongoose/blob/master/History.md) ([5.11.13](https://github.com/Automattic/mongoose/blob/master/History.md#51113--2021-01-20) and on)