# LDBC SNB Enhancer

[![Build Status](https://travis-ci.com/rubensworks/ldbc-snb-enhancer.js.svg?branch=master)](https://travis-ci.com/rubensworks/ldbc-snb-enhancer.js)
[![Coverage Status](https://coveralls.io/repos/github/rubensworks/ldbc-snb-enhancer.js/badge.svg?branch=master)](https://coveralls.io/github/rubensworks/ldbc-snb-enhancer.js?branch=master)
[![npm version](https://badge.fury.io/js/ldbc-snb-enhancer.svg)](https://www.npmjs.com/package/ldbc-snb-enhancer)

Generates auxiliary data based on an [LDBC SNB](https://github.com/ldbc/ldbc_snb_datagen) social network dataset.

For example, it can generate fake names for existing people such as:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000471> a <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person>
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/firstName> "Zulma";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/lastName> "Tulma";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000032985348840411>.
```

All auxiliary data that is generated is annotated with the predicate `http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator`,
which can refer to an existing person, that acts as a _malicious actor_.

## Installation

```bash
$ npm install -g ldbc-snb-enhancer
```
or
```bash
$ yarn global add ldbc-snb-enhancer
```

## Usage

### Invoke from the command line

This tool can be used on the command line as `ldbc-snb-enhancer`,
which takes as single parameter the path to a config file:

```bash
$ ldbc-snb-enhancer path/to/config.json
```

### Config file

The config file that should be passed to the command line tool has the following JSON structure:

```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/ldbc-snb-enhancer/^1.0.0/components/context.jsonld",
  "@id": "urn:ldbc-snb-enhancer:default",
  "@type": "Enhancer",
  "Enhancer:_options_personsPath": "path/to/social_network_person_0_0.ttl",
  "Enhancer:_options_activitiesPath": "path/to/social_network_activity_0_0.ttl",
  "Enhancer:_options_staticPath": "path/to/social_network_static_0_0.ttl",
  "Enhancer:_options_destinationPathData": "path/to/social_network_auxiliary.ttl",
  "Enhancer:_options_logger": {
    "@type": "LoggerStdout"
  },
  "Enhancer:_options_dataSelector": {
    "@type": "DataSelectorRandom",
    "DataSelectorRandom:_seed": 12345
  },
  "Enhancer:_options_handlers": [
    {
      "@type": "EnhancementHandlerPersonNames",
      "EnhancementHandlerPersonNames:_chance": 0.3
    }
  ]
}
```

The important parts in this config file are:
* `"Enhancer:_options_personsPath"`: Path to the persons output file of [LDBC SNB](https://github.com/ldbc/ldbc_snb_datagen).
* `"Enhancer:_options_destinationPath"`: Path of the destination file to create.
* `"Enhancer:_options_logger"`: An optional logger for tracking the generation process. (`LoggerStdout` prints to standard output)
* `"Enhancer:_options_dataSelector"`: A strategy for selecting values from a collection. (`DataSelectorRandom` selects random values based on a given seed)
* `"Enhancer:_options_handlers"`: An array of enhancement handlers, which are strategies for generating data.

## Configure

### Handlers

The following handlers can be configured.

#### Person Names Handler

Generate additional names for existing people.
People are selected randomly from the friends that are known by the given person.

```json
{
  "Enhancer:_options_handlers": [
    {
      "@type": "EnhancementHandlerPersonNames",
      "EnhancementHandlerPersonNames:_chance": 0.3
    }
  ]
}
```

Parameters:
* `"EnhancementHandlerPersonNames:_chance"`: The chance for a name to be generated. The number of new names will be the number of people times this chance, where names are randomly assigned to names.

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000471> a <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person> 
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/firstName> "Zulma";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/lastName> "Tulma";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000032985348840411>.
```

#### Person Names in Cities Handler

Generate additional names for existing people where the malicious creator refers to a city.
Cities will be selected based on the city the random person is located in.

This is a variant of the Person Names Handler.

```json
{
  "Enhancer:_options_handlers": [
    {
      "@type": "EnhancementHandlerPersonNamesCities",
      "EnhancementHandlerPersonNamesCities:_chance": 0.3
    }
  ]
}
```

Parameters:
* `"EnhancementHandlerPersonNamesCities:_chance"`: The chance for a name to be generated. The number of new names will be the number of people times this chance, where names are randomly assigned to names.

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000021990232555617> a <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person>
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/firstName> "Zulma";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/lastName> "Tulma";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://dbpedia.org/resource/Dingzhou>.
```

#### Posts Handler

Generate posts and assign them to existing people.

```json
{
  "Enhancer:_options_handlers": [
    {
      "@type": "EnhancementHandlerPosts",
      "EnhancementHandlerPosts:_chance": 0.3
    }
  ]
}
```

Parameters:
* `"EnhancementHandlerPosts:_chance"`: The chance for posts to be generated. The number of posts will be the number of people times this chance, where people are randomly assigned to posts.

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/post-fake2967> a <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Post>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> "2967";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000004398046512167>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000010995116283441>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/creationDate> "2021-02-22T10:39:31.595Z";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/locationIP> "200.200.200.200";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/browserUsed> "Firefox";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/content> "Tomatoes are blue";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/length> "17";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/language> "en";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/locatedIn> <http://dbpedia.org/resource/Belgium>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasTag> <http://www.ldbc.eu/ldbc_socialnet/1.0/tag/Georges_Bizet>.
```

#### Comments Handler

Generate comments and assign them to existing people as reply to existing posts

```json
{
  "Enhancer:_options_handlers": [
    {
      "@type": "EnhancementHandlerComments",
      "EnhancementHandlerComments:_chance": 0.3
    }
  ]
}
```

Parameters:
* `"EnhancementHandlerComments:_chance"`: The chance for comments to be generated. The number of comments will be the number of people times this chance, where people are randomly assigned to comments.

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/comment-fake9> a <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Comment>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> "9";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000008796093024878>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000032985348839704>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/creationDate> "2021-02-22T10:39:31.595Z";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/locationIP> "200.200.200.200";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/browserUsed> "Firefox";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/content> "Tomatoes are blue";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/length> "17";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/replyOf> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000274877908873>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/language> "en";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/locatedIn> <http://dbpedia.org/resource/Belgium>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasTag> <http://www.ldbc.eu/ldbc_socialnet/1.0/tag/Georges_Bizet>.
```

#### Post Contents Handler

Generate additional contents for existing posts.

```json
{
  "Enhancer:_options_handlers": [
    {
      "@type": "EnhancementHandlerPostContents",
      "EnhancementHandlerPostContents:_chance": 0.3
    }
  ]
}
```

Parameters:
* `"EnhancementHandlerPostContents:_chance"`: The chance for post content to be generated. The number of new post contents will be the number of posts times this chance, where contents are randomly assigned to posts. @range {double}

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000206158430485> <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> "962072675046";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/content> "Tomatoes are blue";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000017592186048516>.
```

#### Post Authors Handler

Generate additional authors for existing posts.

```json
{
  "Enhancer:_options_handlers": [
    {
      "@type": "EnhancementHandlerPostAuthors",
      "EnhancementHandlerPostAuthors:_chance": 0.3
    }
  ]
}
```

Parameters:
* `"EnhancementHandlerPostAuthors:_chance"`: The chance for a post author to be generated. The number of new post authors will be the number of posts times this chance, where authors are randomly assigned to posts.

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000962072675046> <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> "962072675046";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000006597069770017>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000019791209301543>.
```

## License

This software is written by [Ruben Taelman](http://rubensworks.net/).

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
