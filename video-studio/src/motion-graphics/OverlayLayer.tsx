import React from 'react';
import {Sequence, useVideoConfig} from 'remotion';
import type {Overlay} from '../lib/schema';
import {Comparison, EmojiEquation, StepList, VerdictStamp} from './Explainers';
import {LawCard} from './LawCard';
import {LawPage} from './LawPage';
import {BackgroundPlate, BigLetter, Cutout, DenyMark, Flash, DocumentCover, LogoBadge, PhotoCard} from './Media';
import {SelectionLabel} from './SelectionLabel';
import {KineticWord, RevealTitle, TextBadge} from './Kinetic';
import {Sticker} from './Sticker';

export const renderOverlay = (o: Overlay, durationInFrames: number) => {
  const pos = {x: o.x, y: o.y};
  switch (o.type) {
    case 'sticker':
      return <Sticker emoji={o.emoji} size={o.size} {...clean(pos)} />;
    case 'lawCard':
      return <LawCard title={o.title} subtitle={o.subtitle} footnote={o.footnote} color={o.color} {...clean(pos)} />;
    case 'selectionLabel':
      return <SelectionLabel text={o.text} cursor={o.cursor} durationInFrames={durationInFrames} {...clean(pos)} />;
    case 'documentCover':
      return <DocumentCover image={o.image} label={o.label} {...clean(pos)} />;
    case 'logoBadge':
      return <LogoBadge image={o.image} label={o.label} {...clean(pos)} />;
    case 'photoCard':
      return <PhotoCard image={o.image} rotate={o.rotate} w={o.w} h={o.h} label={o.label} {...clean(pos)} />;
    case 'flash':
      return <Flash opacity={o.opacity} durationInFrames={durationInFrames} />;
    case 'cutout':
      return <Cutout image={o.image} w={o.w} rotate={o.rotate} label={o.label} {...clean(pos)} />;
    case 'lawPage':
      return <LawPage source={o.source} heading={o.heading} body={o.body} highlightAt={o.highlightAt} rotate={o.rotate} {...clean(pos)} />;
    case 'backgroundPlate':
      return <BackgroundPlate image={o.image} />;
    case 'bigLetter':
      return <BigLetter text={o.text} {...clean(pos)} />;
    case 'denyMark':
      return <DenyMark durationInFrames={durationInFrames} {...clean(pos)} />;
    case 'kineticWord':
      return <KineticWord syllables={o.syllables} stepFrames={o.stepFrames} layout={o.layout} uppercase={o.uppercase} {...clean(pos)} />;
    case 'revealTitle':
      return <RevealTitle lines={o.lines} stepFrames={o.stepFrames} {...clean(pos)} />;
    case 'textBadge':
      return <TextBadge text={o.text} {...clean(pos)} />;
    case 'verdictStamp':
      return <VerdictStamp text={o.text} tone={o.tone} {...clean(pos)} />;
    case 'stepList':
      return <StepList title={o.title} steps={o.steps} durationInFrames={durationInFrames} {...clean(pos)} />;
    case 'comparison':
      return <Comparison left={o.left} right={o.right} y={o.y} />;
    case 'emojiEquation':
      return <EmojiEquation items={o.items} {...clean(pos)} />;
  }
};

const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** Capas que van DETRÁS del subtítulo pero encima del video. backgroundPlate va primero. */
export const OverlayLayer: React.FC<{overlays: Overlay[]; layer: 'back' | 'behind' | 'front'}> = ({overlays, layer}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {overlays
        .filter((o) => {
          const kind = o.type === 'backgroundPlate' ? 'back' : o.behindPerson ? 'behind' : 'front';
          return kind === layer;
        })
        .map((o, i) => {
          const from = Math.round(o.start * fps);
          const dur = Math.max(1, Math.round((o.end - o.start) * fps));
          return (
            <Sequence key={`${o.type}-${i}`} from={from} durationInFrames={dur} layout="none" name={`${o.type} ${o.start.toFixed(2)}s`}>
              {renderOverlay(o, dur)}
            </Sequence>
          );
        })}
    </>
  );
};
