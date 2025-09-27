# Seasonal Lists Documentation

This document explains how to use seasonal lists with the Featured Content Bar.

## Configuration

To enable seasonal lists, set `useSeasonalLists = true` in the main script.js file.

## Seasonal Periods

The system automatically detects the following periods:

### Special Events (take precedence over seasons)
- **New Year**: January 1-7 → `newyear_list.txt`
- **Valentine's day**: February 10-20 → `valentine_list.txt`
- **Easter**: 1 week around Easter Sunday → `easter_list.txt`
- **Halloween**: October 20-31 → `halloween_list.txt`

### Regular Seasons
- **Spring**: March-May → `spring_list.txt`
- **Summer**: June-August → `summer_list.txt`
- **Autumn**: September-November → `autumn_list.txt`
- **Winter**: December-February → `winter_list.txt`

## List Files

Create the following files in your `featured` directory:

- `spring_list.txt` - Spring movies/shows
- `summer_list.txt` - Summer movies/shows
- `autumn_list.txt` - Autumn movies/shows
- `winter_list.txt` - Winter movies/shows
- `newyear_list.txt` - New Year themed content
- `valentine_list.txt` - Romance/Valentine themed content
- `easter_list.txt` - Easter/Family themed content
- `halloween_list.txt` - Horror/Halloween themed content

## File Format

Each seasonal list file follows the same format as the main `list.txt`:

```
Title of List [muteon/muteoff]
movie_id_1
movie_id_2
series_id_1
...
```

## Fallback

If seasonal lists are disabled or a seasonal file doesn't exist, the system will fall back to using the default `list.txt` file.