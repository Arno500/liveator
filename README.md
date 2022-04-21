# BendoooTV bot and scene switcher

## OBS

### Scenes

Scenes must have this format:

```
{{number of streamers}}-{{random weight}}-{{scene name}}
```

There must be a first scene (usually called "Parking") with all the streams named like this: `SRT{{index of stream}}`.

### Templates

What I call "templates" are in fact color sources transformed to the destination size, where streams will be placed. They must respect this naming:

```
{{number of streamers}}-{{source volume}}-{{scene name}}
```

For text to be inline with the streamer names set in the envs, you can use this format and the bot will automatically detect the sources and feed them:

```
{{index of stream}}-{{name}}
```

For text made to be dynamically adjusted (like follower count, last follower, etc.):

```
templated-{{key}}-{{name}}
```