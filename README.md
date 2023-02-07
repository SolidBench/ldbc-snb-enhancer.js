# LDBC SNB Enhancer

[![Build status](https://github.com/SolidBench/ldbc-snb-enhancer.js/workflows/CI/badge.svg)](https://github.com/SolidBench/ldbc-snb-enhancer.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/SolidBench/ldbc-snb-enhancer.js/badge.svg?branch=master)](https://coveralls.io/github/SolidBench/ldbc-snb-enhancer.js?branch=master)
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
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/ldbc-snb-enhancer/^2.0.0/components/context.jsonld",
  "@id": "urn:ldbc-snb-enhancer:default",
  "@type": "Enhancer",
  "personsPath": "path/to/social_network_person_0_0.ttl",
  "activitiesPath": "path/to/social_network_activity_0_0.ttl",
  "staticPath": "path/to/social_network_static_0_0.ttl",
  "destinationPathData": "path/to/social_network_auxiliary.ttl",
  "logger": {
    "@type": "LoggerStdout"
  },
  "dataSelector": {
    "@type": "DataSelectorRandom",
    "seed": 12345
  },
  "handlers": [
    {
      "@type": "EnhancementHandlerPersonNames",
      "chance": 0.3
    }
  ]
}
```

The important parts in this config file are:
* `"personsPath"`: Path to the persons output file of [LDBC SNB](https://github.com/ldbc/ldbc_snb_datagen).
* `"destinationPath"`: Path of the destination file to create.
* `"logger"`: An optional logger for tracking the generation process. (`LoggerStdout` prints to standard output)
* `"dataSelector"`: A strategy for selecting values from a collection. (`DataSelectorRandom` selects random values based on a given seed)
* `"handlers"`: An array of enhancement handlers, which are strategies for generating data.
* `"parameterEmitterPosts""`: An optional parameter emitter for the extracted posts.
* `"parameterEmitterComments""`: An optional parameter emitter for the extracted comments.

## Configure

### Handlers

The following handlers can be configured.

#### Person Names Handler

Generate additional names for existing people.
People are selected randomly from the friends that are known by the given person.

```json
{
  "handlers": [
    {
      "@type": "EnhancementHandlerPersonNames",
      "chance": 0.3
    }
  ]
}
```

Parameters:
* `"chance"`: The chance for a name to be generated. The number of new names will be the number of people times this chance, where names are randomly assigned to names.
* `"parameterEmitter""`: An optional parameter emitter.

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
  "handlers": [
    {
      "@type": "EnhancementHandlerPersonNamesCities",
      "chance": 0.3
    }
  ]
}
```

Parameters:
* `"chance"`: The chance for a name to be generated. The number of new names will be the number of people times this chance, where names are randomly assigned to names.
* `"parameterEmitter""`: An optional parameter emitter.

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000021990232555617> a <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person>
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/firstName> "Zulma";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/lastName> "Tulma";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://dbpedia.org/resource/Dingzhou>.
```

#### Person Noise Handler

Generate additional triples attached to existing people.
People are selected randomly.

```json
{
  "handlers": [
    {
      "@type": "EnhancementHandlerPersonNoise",
      "chance": 0.3
    }
  ]
}
```

Parameters:
* `"chance"`: The chance for an additional triple to be generated. The number of new triples will be the number of people times this chance. This value can be larger than 1 to generate multiple triples per person.

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000471-noise-1> 
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/noise> "NOISE-1";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000471>.
```

#### Posts Handler

Generate posts and assign them to existing people.

```json
{
  "handlers": [
    {
      "@type": "EnhancementHandlerPosts",
      "chance": 0.3
    }
  ]
}
```

Parameters:
* `"chance"`: The chance for posts to be generated. The number of posts will be the number of people times this chance, where people are randomly assigned to posts.

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
  "handlers": [
    {
      "@type": "EnhancementHandlerComments",
      "chance": 0.3
    }
  ]
}
```

Parameters:
* `"chance"`: The chance for comments to be generated. The number of comments will be the number of people times this chance, where people are randomly assigned to comments.

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
  "handlers": [
    {
      "@type": "EnhancementHandlerPostContents",
      "chance": 0.3
    }
  ]
}
```

Parameters:
* `"chance"`: The chance for post content to be generated. The number of new post contents will be the number of posts times this chance, where contents are randomly assigned to posts. @range {double}

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
  "handlers": [
    {
      "@type": "EnhancementHandlerPostAuthors",
      "chance": 0.3
    }
  ]
}
```

Parameters:
* `"chance"`: The chance for a post author to be generated. The number of new post authors will be the number of posts times this chance, where authors are randomly assigned to posts.

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000962072675046> <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> "962072675046";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000006597069770017>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasMaliciousCreator> <http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000019791209301543>.
```

#### Vocabuary Handler

Generates vocabulary information.

```json
{
  "handlers": [
    {
      "@type": "EnhancementHandlerVocabulary"
    }
  ]
}
```

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> a rdf:Property.
<http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/hasCreator> a rdf:Property.
<http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person> a rdfs:Class.
```

#### Vocabulary Predicate Domain Handler

Generates vocabulary information about the domain of a specific predicate.

```json
{
  "handlers": [
     {
      "@type": "EnhancementHandlerVocabularyPredicateDomain",
      "classIRI": "http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Comment",
      "predicateIRI": "http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/locationIP"
    }
  ]
}
```

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/locationIP> rdfs:domain
<http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Comment>.
```

#### Posts Multiply Handler

Multiply the number of posts by a given amount.

```json
{
  "handlers": [
     {
       "@type": "EnhancementHandlerPostsMultiply",
       "factor": 10
    }
  ]
}
```

Generated shape:
```turtle
<http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000618475290624000001>
    a <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Post>;
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> "618475290624000001";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/browserUsed> "Firefox";
    <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/content> "About Rupert Murdoch ... COPY 1";
```

### Parameter Emitters

Certain handlers allow their internal parameters to be emitted.

Such parameters may then for instance be valuable as query substitution parameters.

#### CSV Parameter Emitter

Emits parameters as CSV files.

```json
{
  "handlers": [
    {
      "@type": "EnhancementHandlerPersonNames",
      "chance": 0.3,
      "parameterEmitter": {
        "@type": "ParameterEmitterCsv",
        "destinationPath": "parameters-person-names.csv"
      }
    }
  ]
}
```

## License

This software is written by [Ruben Taelman](http://rubensworks.net/).

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
