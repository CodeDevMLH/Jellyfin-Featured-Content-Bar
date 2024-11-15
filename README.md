# SpotlightTrailer - Featured Content Bar
Thanks to [SethBacon](https://forum.jellyfin.org/u-sethbacon) & [BobHasNoSoul](https://github.com/BobHasNoSoul) & [MakD](https://github.com/MakD) & [tedhinklater](https://github.com/tedhinklater) for their talents and work

# Main Differences in this fork
- activate random selection of movie from txt list
- show the featured bar only at the main page, hide it in favorites/requests tab
- back button added
- set txt list name
- small ui style fixes

Testet on Jellyfin 10.10.0

---

![overview](/images/demo1.gif)


## How to install
1. Download [spotlight.html](/spotlight.html), [script.js](/script.js) and [styles.css](/styles.css)

2. Go to your ```jellyfin-web``` folder and create a folder named ```ui``` and drop ```spotlight.html, script.js and styles.css``` in that folder

3. In your Jellyfin Dashboard, under ```API Keys``` create an API key for Spotlight, copy the key, and insert it as the value for the ```token``` variable in ```script.js```. You can also set the corresponding values for list name, random selection, show it only on main page, plot length, etc.

4. ```Important: Use Notepad++ for this``` In the jellyfin-web folder, open the file ```home-html.RANDOMSTRINGHERE.chunk.js```

5. Ctrl+F and search for ```data-backdroptype="movie,series,book">``` 

6. Paste this after the >

```js
<style> .featurediframe {width: 95vw; height: 24em; display: block; border: 0; margin: -1em auto 0;} @media (min-width: 2100px) {.featurediframe {height: 33em;}} @media (max-width: 1599px) {.featurediframe {margin-top: 1.2em;}} @media (max-width: 800px) {.featurediframe {margin-top: 0.8em;}} </style> <iframe class="featurediframe" src="/web/ui/spotlight.html"></iframe>
```
7. Save the file.

8. Empty your browser's cached web content (Ctrl+F5 or empty it from your browser's Cookies and Site Data settings section)

9. That's it.

![clips](/images/all_clips.gif)

# Web View (Movie and series)
![mobile](/images/desktop.png)

# Mobile View (Landscape / Portrait)
![mobile](/images/mobile.png)

# How to feature specific content in the bar

By default, the bar will feature content at random as long as it is available to the current user. 

To preselect content, place a [list.txt](/list.txt) in the ```ui``` folder and paste the ID of each piece of content to be featured (IDs can be found in the address bar). 

# Uninstallation

Simply delete Step 5's snippet added to ```home-html.chunk.js``` then refresh your browser's cache.

# Fullscreen Version

No changes here from my side...

![fullscreen](/images/fullscreen.gif)

Same as above except use [this version of spotlight.html](/fullscreen/spotlight.html) 

insert this into home-html.RANDOMSTRINGHERE.chunk.js after ```data-backdroptype="movie,series,book">``` 

```js
<style>.featurediframe { width: 100vw; height: 100vh; display: block; border: 0px solid #000; margin: 0 auto; margin-bottom: 40px} @media (max-width:1000px) and (orientation:portrait) {.featurediframe {height: 46vh; width: 95vw;}} @media (max-width:1000px) and (orientation:landscape) {.featurediframe {height: 98vh; width: 95vw;}} @media (min-width: 2000px) { .featurediframe {height:102vh;}}</style><iframe class="featurediframe" src="/web/ui/spotlight.html"></iframe>
```

and add this CSS to the very ```end``` of your Custom CSS

```css
.layout-desktop .page.homePage.libraryPage.allLibraryPage.backdropPage.pageWithAbsoluteTabs.withTabs.mainAnimatedPage { margin-top:-4.5em;}
.layout-desktop .overflowBackdropCard, .overflowSmallBackdropCard {  width: 12.7vw !important;  padding-right: 1.85em;}
.layout-desktop .skinHeader-withBackground {background-color: transparent; backdrop-filter: blur(0px);}
.layout-desktop #homeTab .section0 .sectionTitle.sectionTitle-cards.padded-left {  display: none !important;}
.layout-desktop #homeTab .verticalSection.section1.emby-scroller-container {  position: relative;  top: -27em;  left: 73em; width: 44vw; margin-bottom: -17em;}
.layout-desktop #homeTab .verticalSection.section2.emby-scroller-container::after { content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100vw; background: black; z-index: -1;}
[dir="ltr"] #homeTab .verticalSection.section0.emby-scroller-container .emby-scrollbuttons {right: -5em; top: -2em;}
.layout-desktop #homeTab .verticalSection.section0 .cardText-first {display: none !important;}
.layout-desktop #homeTab .sections.homeSectionsContainer { margin-top: 2em;}
```
