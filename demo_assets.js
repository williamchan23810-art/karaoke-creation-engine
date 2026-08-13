// Karaoke Creation Engine - Demo Assets
// Contains pre-aligned lyric lines with word-level timestamps and song story metadata.

export const DEMO_SONGS = {
  beyond_cantonese: {
    metadata: {
      songName: "海闊天空 (Under a Vast Sky)",
      singerBand: "Beyond",
      composer: "黃家駒 (Wong Ka Kui)",
      publishedYear: "1993",
      songBio: "Beyond的經典代表作，由主唱黃家駒親自作曲並填詞。這首歌代表了對自由與夢想的堅持，也是家駒在日本逝世前的絕響之作，激勵了無數世代的人追尋理想。",
      singerBio: "Beyond是香港殿堂級搖滾樂隊。黃家駒（1962-1993）是樂隊的靈魂人物、主唱兼吉他手，他的音樂創作深刻且具備人文關懷，影響了整個華語樂壇。",
      famousCovers: "林子祥、李克勤、張敬軒、鄧紫棋 (G.E.M.)，以及無數街頭藝人與全球華人的大合唱版本。",
      publisher: "華納唱片 (Warner Music Hong Kong)"
    },
    config: {
      bgType: "image",
      bgUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920", // Sky/ocean vibe
      bgOverlayOpacity: 0.45,
      stylePreset: "Cinematic",
      fontFamily: "Noto Sans TC",
      audioFadeOutDuration: 5,
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    },
    lyrics: [
      {
        id: "c1",
        speaker: "lead",
        words: [
          { word: "今", startTime: 1.0, endTime: 1.4 },
          { word: "天", startTime: 1.4, endTime: 1.8 },
          { word: "我", startTime: 1.9, endTime: 2.3 },
          { word: "寒", startTime: 2.4, endTime: 2.8 },
          { word: "夜", startTime: 2.8, endTime: 3.2 },
          { word: "裡", startTime: 3.3, endTime: 3.7 },
          { word: "看", startTime: 3.8, endTime: 4.2 },
          { word: "雪", startTime: 4.2, endTime: 4.6 },
          { word: "飄", startTime: 4.6, endTime: 5.2 },
          { word: "過", startTime: 5.2, endTime: 6.0 }
        ]
      },
      {
        id: "c2",
        speaker: "lead",
        words: [
          { word: "懷", startTime: 6.5, endTime: 7.0 },
          { word: "著", startTime: 7.0, endTime: 7.4 },
          { word: "冷", startTime: 7.5, endTime: 8.0 },
          { word: "冷", startTime: 8.0, endTime: 8.5 },
          { word: "的", startTime: 8.6, endTime: 8.9 },
          { word: "心", startTime: 9.0, endTime: 9.4 },
          { word: "窩", startTime: 9.5, endTime: 10.0 },
          { word: "漂", startTime: 10.1, endTime: 10.6 },
          { word: "遠", startTime: 10.6, endTime: 11.2 },
          { word: "方", startTime: 11.2, endTime: 12.0 }
        ]
      },
      {
        id: "c3",
        speaker: "lead",
        words: [
          { word: "風", startTime: 12.8, endTime: 13.3 },
          { word: "雨", startTime: 13.3, endTime: 13.8 },
          { word: "裡", startTime: 13.9, endTime: 14.4 },
          { word: "追", startTime: 14.5, endTime: 15.0 },
          { word: "趕", startTime: 15.0, endTime: 15.8 }
        ]
      },
      {
        id: "c4",
        speaker: "lead",
        words: [
          { word: "霧", startTime: 16.2, endTime: 16.6 },
          { word: "裡", startTime: 16.6, endTime: 17.0 },
          { word: "分", startTime: 17.1, endTime: 17.6 },
          { word: "不", startTime: 17.6, endTime: 18.0 },
          { word: "清", startTime: 18.1, endTime: 18.5 },
          { word: "影", startTime: 18.6, endTime: 19.2 },
          { word: "蹤", startTime: 19.2, endTime: 20.2 }
        ]
      },
      {
        id: "c5",
        speaker: "lead",
        words: [
          { word: "天", startTime: 20.8, endTime: 21.3 },
          { word: "空", startTime: 21.3, endTime: 21.8 },
          { word: "海", startTime: 21.9, endTime: 22.4 },
          { word: "闊", startTime: 22.4, endTime: 23.0 },
          { word: "你", startTime: 23.1, endTime: 23.5 },
          { word: "與", startTime: 23.5, endTime: 23.9 },
          { word: "我", startTime: 24.0, endTime: 24.6 },
          { word: "可", startTime: 24.7, endTime: 25.2 },
          { word: "會", startTime: 25.2, endTime: 25.7 },
          { word: "變", startTime: 25.7, endTime: 27.5 }
        ]
      }
    ]
  },
  teresa_teng_mandarin: {
    metadata: {
      songName: "月亮代表我的心",
      singerBand: "鄧麗君 (Teresa Teng)",
      composer: "翁清溪 (Weng Ching-hsi)",
      publishedYear: "1977",
      songBio: "這首歌最初由陳芬蘭唱紅，但鄧麗君於1977年重新詮釋的版本將其推向了全球華人的巔峰。歌詞溫柔細細道來，將深情寄託給不變的月亮，成為歷史上最著名的華語流行歌曲之一。",
      singerBio: "鄧麗君（1953-1995）是華語樂壇最具影響力的歌唱家之一。她的歌聲溫婉甜美，紅遍兩岸三地、日本及東南亞地區，被譽為「有華人的地方就有鄧麗君的歌聲」。",
      famousCovers: "張國榮 (1997年跨越97演唱會經典改編)、梅艷芳、劉德華、陶喆 (R&B風格改編)、言承旭。",
      publisher: "麗風唱片 (Life Records)"
    },
    config: {
      bgType: "image",
      bgUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920", // Moon/night sky vibe
      bgOverlayOpacity: 0.4,
      stylePreset: "Cottagecore",
      fontFamily: "Noto Serif TC",
      audioFadeOutDuration: 4,
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    },
    lyrics: [
      {
        id: "m1",
        speaker: "lead",
        words: [
          { word: "你", startTime: 1.0, endTime: 1.6 },
          { word: "問", startTime: 1.7, endTime: 2.2 },
          { word: "我", startTime: 2.3, endTime: 3.0 },
          { word: "愛", startTime: 3.2, endTime: 3.8 },
          { word: "你", startTime: 3.9, endTime: 4.4 },
          { word: "有", startTime: 4.5, endTime: 5.0 },
          { word: "多", startTime: 5.1, endTime: 5.6 },
          { word: "深", startTime: 5.6, endTime: 6.8 }
        ]
      },
      {
        id: "m2",
        speaker: "duet_a",
        words: [
          { word: "我", startTime: 7.2, endTime: 7.8 },
          { word: "愛", startTime: 7.9, endTime: 8.4 },
          { word: "你", startTime: 8.5, endTime: 9.0 },
          { word: "有", startTime: 9.1, endTime: 9.6 },
          { word: "幾", startTime: 9.7, endTime: 10.2 },
          { word: "分", startTime: 10.2, endTime: 11.2 }
        ]
      },
      {
        id: "m3",
        speaker: "lead",
        words: [
          { word: "我", startTime: 12.0, endTime: 12.4 },
          { word: "的", startTime: 12.4, endTime: 12.8 },
          { word: "情", startTime: 12.9, endTime: 13.5 },
          { word: "也", startTime: 13.6, endTime: 14.1 },
          { word: "真", startTime: 14.2, endTime: 15.0 }
        ]
      },
      {
        id: "m4",
        speaker: "duet_b",
        words: [
          { word: "我", startTime: 15.5, endTime: 15.9 },
          { word: "的", startTime: 15.9, endTime: 16.3 },
          { word: "愛", startTime: 16.4, endTime: 17.0 },
          { word: "也", startTime: 17.1, endTime: 17.6 },
          { word: "真", startTime: 17.7, endTime: 18.8 }
        ]
      },
      {
        id: "m5",
        speaker: "lead",
        words: [
          { word: "月", startTime: 19.5, endTime: 20.0 },
          { word: "亮", startTime: 20.1, endTime: 20.6 },
          { word: "代", startTime: 20.7, endTime: 21.2 },
          { word: "表", startTime: 21.3, endTime: 22.0 },
          { word: "我", startTime: 22.1, endTime: 22.6 },
          { word: "的", startTime: 22.6, endTime: 23.0 },
          { word: "心", startTime: 23.1, endTime: 24.5 }
        ]
      }
    ]
  }
};
