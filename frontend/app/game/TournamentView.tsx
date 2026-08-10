'use client';

import { useRef, useState } from 'react';
import { Tournament, type TournamentMatch } from './tournament';
import { DEFAULT_CONFIG } from './config';
import { PongMatch } from './PongMatch';
import type { Side } from './types';
import { useTranslation } from 'react-i18next';
import Input from '@/components/input';

type Phase = 'register' | 'play' | 'done';

export function TournamentView({
  onExit,
}: {
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('register');
  const [names, setNames] = useState<string[]>(['', '']);
  const [ready, setReady] = useState(false);
  const [, forceRender] = useState(0);
  const { t } = useTranslation();

  const tournamentRef = useRef<Tournament | null>(null);

  const cleanNames = names
    .map((name) => name.trim())
    .filter(Boolean);

  const uniqueNames =
    new Set(cleanNames.map((name) => name.toLowerCase())).size ===
    cleanNames.length;

  const canStart =
    cleanNames.length >= 2 &&
    cleanNames.length <= 8 &&
    uniqueNames;

    const startTournament = () => {
      if (!canStart) return;
    
      tournamentRef.current = new Tournament(cleanNames);
      setScore({
        left: 0,
        right: 0,
      });
      setReady(false);
      setPhase('play');
    };

  const resetTournament = () => {
    tournamentRef.current = null;
    setNames(['', '']);
    setReady(false);
    setPhase('register');
  };

  const updateName = (index: number, value: string) => {
    setNames((currentNames) =>
      currentNames.map((name, currentIndex) =>
        currentIndex === index ? value : name,
      ),
    );
  };

  const [lastResult, setLastResult] = useState<{
    winner: string;
    loser: string;
    score: {
      left: number;
      right: number;
    };
  } | null>(null);

  const [score, setScore] = useState({
    left: 0,
    right: 0,
  });

  const addPlayer = () => {
    if (names.length >= 8) return;

    setNames((currentNames) => [...currentNames, '']);
  };

  const removePlayer = (index: number) => {
    if (names.length <= 2) return;

    setNames((currentNames) =>
      currentNames.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    );
  };

  // ------------------------------------------------------------ REGISTER
  if (phase === 'register') {
    return (
      <div className="flex min-h-[calc(100dvh-48px)] flex-col bg-[#F7F5F1]">
        <main className="flex flex-1">
          <section
            className="
              flex
              w-full
              flex-col
              px-6
              pb-8
              pt-6
              md:px-16
              md:pt-8
            "
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-5 sm:gap-6 lg:relative lg:min-h-[70px] lg:items-start lg:justify-center justify-center">
              <button
                type="button"
                onClick={onExit}
                className="
                  h-[42px]
                  w-full
                  max-w-[240px]
                  rounded-full
                  border
                  border-[#D9D5D1]
                  px-4
                  text-[13px]
                  font-medium
                  uppercase
                  text-[#615050]
                  transition-colors
                  hover:bg-[#D9D9D9]/20
                  sm:h-[46px]
                  sm:w-auto
                  sm:min-w-[190px]
                  sm:px-8
                  sm:text-[14px]
                  lg:absolute
                  lg:left-0
                  lg:top-0
                "
              >
                {t('tournament.back')}
              </button>

              <div className="flex w-full flex-col items-center text-center">
                <h1
                  className="
                    font-display
                    text-[clamp(2rem,8vw,64px)]
                    uppercase
                    leading-none
                    text-brand-red
                  "
                >
                  {t('tournament.title')}
                </h1>

                <p className="mt-3 text-[14px] text-[#615050]">
                {t('tournament.addPlayers')}
                </p>
              </div>
            </div>

            {/* Registration card */}
            <div
              className="
                mx-auto
                mt-7
                w-full
                max-w-[820px]
                rounded-[14px]
                bg-white
                px-4
                py-6
                shadow-[-8px_8px_32px_0_rgba(193,168,163,0.20)]
                sm:px-6
                sm:py-8
                md:px-10
                md:py-10
              "
            >
              <div className="mb-7">
                <p
                  className="
                    text-[13px]
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-[#615050]
                  "
                >
                  {t('tournament.players')}
                </p>

                <p className="mt-2 text-[13px] text-[#918787]">
                {t('tournament.uniqueNames')}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {names.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <label
                        htmlFor={`tournament-player-${index}`}
                        className="
                          mb-1.5
                          block
                          text-[12px]
                          font-medium
                          uppercase
                          tracking-[0.06em]
                          text-[#615050]
                        "
                      >
                        {t('tournament.player')} {index + 1}
                      </label>

                      <Input
                        id={`tournament-player-${index}`}
                        name={`tournament-player-${index}`}
                        value={name}
                        onValueChange={(value) => updateName(index, value)}
                        placeholder={`${t('tournament.player')} ${index + 1}`}
                        maxLength={16}
                        autoComplete="off"
                      />
                    </div>

                    {names.length > 2 && (
                      <button
                        type="button"
                        aria-label={`Remove player ${index + 1}`}
                        onClick={() => removePlayer(index)}
                        className="
                          mt-[22px]
                          flex
                          h-[46px]
                          w-[46px]
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[#D9D5D1]
                          text-[18px]
                          font-light
                          text-[#615050]
                          transition-colors
                          hover:border-[#615050]
                          hover:bg-[#D9D9D9]/20
                        "
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {names.length < 8 && (
                <button
                  type="button"
                  onClick={addPlayer}
                  className="
                    mt-5
                    h-[46px]
                    w-full
                    rounded-full
                    border
                    border-dashed
                    border-[#CFC5C1]
                    text-[13px]
                    font-medium
                    uppercase
                    tracking-[0.05em]
                    text-[#615050]
                    transition-colors
                    hover:border-[#615050]
                    hover:bg-[#D9D9D9]/20
                  "
                >
                  {t('tournament.addPlayer')}
                </button>
              )}

              {!uniqueNames && cleanNames.length >= 2 && (
                <p className="mt-4 text-center text-[13px] text-brand-red">
                  {t('tournament.playerNamesUnique')}
                </p>
              )}

              <div
                className="
                  mt-8
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                  sm:justify-center
                "
              >
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={startTournament}
                  className="
                    h-[48px]
                    w-full
                    sm:w-auto
                    sm:min-w-[220px]
                    rounded-full
                    bg-brand-green
                    px-8
                    text-[13px]
                    font-medium
                    uppercase
                    tracking-[0.08em]
                    text-white
                    transition-colors
                    hover:bg-[#808979]
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    disabled:hover:bg-brand-green
                  "
                >
                  {t('tournament.start')}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const tournament = tournamentRef.current;

  if (!tournament) {
    return null;
  }

  // --------------------------------------------------------------- DONE
  if (phase === 'done') {
    return (
      <div className="flex min-h-[calc(100dvh-48px)] flex-col bg-[#F7F5F1]">
        <main className="flex flex-1">
          <section
            className="
              flex
              w-full
              flex-col
              px-6
              pb-8
              pt-6
              md:px-16
              md:pt-8
            "
          >
            <div className="flex flex-col items-center gap-5 justify-center sm:gap-6 lg:relative lg:min-h-[70px] lg:items-start lg:justify-center">
              <button
                type="button"
                onClick={onExit}
                className="
                  h-[42px]
                  w-full
                  max-w-[240px]
                  rounded-full
                  border
                  border-[#D9D5D1]
                  px-4
                  text-[13px]
                  font-medium
                  uppercase
                  text-[#615050]
                  transition-colors
                  hover:bg-[#D9D9D9]/20
                  sm:h-[46px]
                  sm:w-auto
                  sm:min-w-[190px]
                  sm:px-8
                  sm:text-[14px]
                  lg:absolute
                  lg:left-0
                  lg:top-0
                "
              >
                {t('tournament.back')}
              </button>

              <div className="flex w-full flex-col items-center text-center">
                <h1
                  className="
                    font-display
                    text-[clamp(2rem,8vw,64px)]
                    uppercase
                    leading-none
                    text-brand-red
                  "
                >
                  {t('tournament.title')}
                </h1>
              </div>
            </div>

            <div
              className="
                mx-auto
                mt-7
                w-full
                max-w-[1000px]
                rounded-[14px]
                bg-white
                px-6
                py-8
                shadow-[-8px_8px_32px_0_rgba(193,168,163,0.20)]
                md:px-10
                md:py-10
              "
            >
              <div className="flex flex-col items-center text-center">
                <p
                  className="
                    text-[12px]
                    font-medium
                    uppercase
                    tracking-[0.14em]
                    text-[#615050]
                  "
                >
                  {t('tournament.champion')}
                </p>

                <h2
                  className="
                    mt-3
                    font-display
                    max-w-full
                    break-words
                    text-[clamp(2.2rem,10vw,76px)]
                    uppercase
                    leading-none
                    text-brand-red
                  "
                >
                  {tournament.champion}
                </h2>

                <p className="mt-4 text-[14px] text-[#615050]">
                {t('tournament.championDescription')}
                </p>
              </div>

              <div
                className="
                  mt-9
                  rounded-[12px]
                  border
                  border-[#EEE9E6]
                  bg-[#FAF9F7]
                  px-4
                  py-6
                  md:px-6
                "
              >
                <Bracket
                  rounds={tournament.rounds}
                  currentMatch={null}
                />
              </div>

              <div
                className="
                  mt-8
                  flex
                  flex-col
                  justify-center
                  gap-3
                  sm:flex-row
                "
              >
                <button
                  type="button"
                  onClick={resetTournament}
                  className="
                    h-[48px]
                    w-full
                    sm:w-auto
                    sm:min-w-[220px]
                    rounded-full
                    bg-brand-green
                    px-8
                    text-[13px]
                    font-medium
                    uppercase
                    tracking-[0.08em]
                    text-white
                    transition-colors
                    hover:bg-[#808979]
                  "
                >
                  {t('tournament.newTournament')}
                </button>

                <button
                  type="button"
                  onClick={onExit}
                  className="
                    h-[48px]
                    w-full
                    sm:w-auto
                    sm:min-w-[220px]
                    rounded-full
                    border-[1.5px]
                    border-[#D9D5D1]
                    px-8
                    text-[13px]
                    font-medium
                    uppercase
                    tracking-[0.08em]
                    text-[#615050]
                    transition-colors
                    hover:border-[#615050]
                    hover:bg-[#D9D9D9]/20
                  "
                >
                  {t('tournament.back')}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // --------------------------------------------------------------- PLAY
  const currentMatch = tournament.current;

if (!currentMatch) {
  return null;
}

const handleWinner = (side: Side) => {
  const winnerName =
    side === 'left'
      ? currentMatch.p1
      : currentMatch.p2;

  const loserName =
    side === 'left'
      ? currentMatch.p2
      : currentMatch.p1;

  if (!winnerName || !loserName) return;

  const finalScore =
  side === 'left'
    ? {
        left: 5,
        right: score.right,
      }
    : {
        left: score.left,
        right: 5,
      };

setLastResult({
  winner: winnerName,
  loser: loserName,
  score: finalScore,
});

setScore(finalScore);

  tournament.reportWinner(winnerName);

  if (tournament.isComplete) {
    setPhase('done');
    return;
  }

  setReady(false);
  forceRender((value) => value + 1);
};

  return (
    <div className="flex min-h-[calc(100dvh-48px)] flex-col bg-[#F7F5F1]">
      <main className="flex flex-1">
        <section
          className="
            flex
            w-full
            flex-col
            px-6
            pb-8
            pt-6
            md:px-16
            md:pt-8
          "
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-5 sm:gap-6 lg:relative lg:min-h-[70px] lg:items-start lg:justify-center justify-center">
            <button
              type="button"
              onClick={onExit}
              className="
                  h-[42px]
                  w-full
                  max-w-[240px]
                  rounded-full
                  border
                  border-[#D9D5D1]
                  px-4
                  text-[13px]
                  font-medium
                  uppercase
                  text-[#615050]
                  transition-colors
                  hover:bg-[#D9D9D9]/20
                  sm:h-[46px]
                  sm:w-auto
                  sm:min-w-[190px]
                  sm:px-8
                  sm:text-[14px]
                  lg:absolute
                  lg:left-0
                  lg:top-0
              "
            >
              {t('tournament.leave')}
            </button>

            <div className="flex w-full flex-col items-center text-center">
              <h1
                className="
                  font-display
                  text-[clamp(2rem,8vw,64px)]
                  uppercase
                  leading-none
                  text-brand-red
                "
              >
                {t('tournament.title')}
              </h1>

              <p
                className="
                  mt-3
                  text-[13px]
                  font-medium
                  uppercase
                  tracking-[0.12em]
                  text-[#615050]
                "
              >
                {t('tournament.round')} {currentMatch.round + 1}
              </p>
            </div>
          </div>

          {/* Match card */}
          
          <div
            className="
              mx-auto
              mt-4
              w-full
              max-w-[1085px]
              rounded-[14px]
              bg-white
              px-5
              pb-5
              pt-4
              md:px-6
            "
          >
  {/* Ники и счёт — только во время самой игры */}
  {ready && (
  <div
    className="
      grid
      grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
      items-end
      gap-2
      pb-3
      sm:gap-4
      sm:pb-4
    "
  >
    {/* Левый игрок */}
    <div className="min-w-0">
      <p
        className="
          truncate
          text-[13px]
          font-semibold
          text-black
          sm:text-[16px]
          md:text-[20px]
        "
      >
        {currentMatch.p1}
      </p>
    </div>

    {/* Счёт */}
    <div
      className="
        flex
        shrink-0
        items-center
        gap-2
        text-[28px]
        font-semibold
        leading-none
        text-black
        sm:gap-3
        sm:text-[36px]
        md:gap-4
        md:text-[44px]
      "
    >
      <span>{score.left}</span>

      <span className="text-[20px] text-[#777171] sm:text-[24px] md:text-[30px]">
        :
      </span>

      <span>{score.right}</span>
    </div>

    {/* Правый игрок */}
    <div className="min-w-0 text-right">
      <p
        className="
          truncate
          text-[13px]
          font-semibold
          text-black
          sm:text-[16px]
          md:text-[20px]
        "
      >
        {currentMatch.p2}
      </p>
    </div>
  </div>
)}

  {/* Чёрное поле ограничено шириной белой карточки */}
  <div
    className={`
      relative
      flex
      w-full
      items-center
      justify-center
      overflow-hidden
      rounded-[14px]
      bg-[#171717]
      ${ready ? '' : 'min-h-[260px] sm:min-h-[300px] md:min-h-[330px]'}
    `}
  >
    {ready ? (
      <PongMatch
        key={
          currentMatch.round * 100 +
          currentMatch.index
        }
        config={DEFAULT_CONFIG}
        vsAi={false}
        onScoreChange={setScore}
        onFinish={handleWinner}
      />
    ) : lastResult ? (
      /* Результат предыдущего матча */
      <div
        className="
          flex
          min-h-[260px]
          sm:min-h-[300px]
          md:min-h-[330px]
          w-full
          max-w-[400px]
          flex-col
          items-center
          justify-center
          px-6
          text-center
        "
      >
        <p
          className="
            text-[12px]
            font-medium
            uppercase
            tracking-[0.14em]
            text-[#BEB7B2]
          "
        >
          {t('tournament.winner')}
        </p>

        <h2
          className="
            mt-4
            break-all
            font-display
            text-[clamp(2.5rem,5vw,56px)]
            uppercase
            leading-none
            text-brand-red
          "
        >
          {lastResult.winner}
        </h2>

        <div
          className="
            mt-5
            flex
            items-center
            gap-4
            text-[38px]
            font-semibold
            leading-none
            text-white
          "
        >
          <span>{lastResult.score.left}</span>

          <span className="text-[24px] text-[#777171]">
            :
          </span>

          <span>{lastResult.score.right}</span>
        </div>

        <p className="mt-4 text-[14px] text-[#BEB7B2]">
        {t('tournament.winnerText', {
          winner: lastResult.winner,
          loser: lastResult.loser,
        })}
        </p>

        <button
          type="button"
          onClick={() => {
            setLastResult(null);
            setScore({
              left: 0,
              right: 0,
            });
          }}
          className="
            mt-7
            h-[48px]
            min-w-[210px]
            rounded-full
            bg-brand-green
            px-8
            text-[13px]
            font-medium
            uppercase
            tracking-[0.08em]
            text-white
            transition-colors
            hover:bg-[#808979]
          "
        >
          {t('tournament.next')}
        </button>
      </div>
    ) : (
      /* Следующий матч */
      <div
        className="
          flex
          min-h-[260px]
          sm:min-h-[300px]
          md:min-h-[330px]
          w-full
          max-w-[360px]
          flex-col
          items-center
          justify-center
          px-6
          text-center
        "
      >
        <p
          className="
            text-[12px]
            font-medium
            uppercase
            tracking-[0.14em]
            text-[#BEB7B2]
          "
        >
          {t('tournament.next')}
        </p>

        <h2
          className="
            mt-4
            font-display
            text-[clamp(2rem,4vw,44px)]
            max-w-full
            break-words
            uppercase
            leading-none
            text-white
          "
        >
          {currentMatch.p1}
        </h2>

        <p className="my-2 text-[14px] uppercase tracking-[0.14em] text-[#918787]">
          vs
        </p>

        <h2
          className="
            font-display
            text-[clamp(2rem,4vw,44px)]
            max-w-full
            break-words
            uppercase
            leading-none
            text-white
          "
        >
          {currentMatch.p2}
        </h2>

        <button
          type="button"
          onClick={() => {
            setScore({
              left: 0,
              right: 0,
            });

            setReady(true);
          }}
          className="
            mt-7
            h-[48px]
            min-w-[190px]
            rounded-full
            bg-brand-red
            px-8
            text-[13px]
            font-medium
            uppercase
            tracking-[0.08em]
            text-white
            transition-colors
            hover:bg-[#D9361F]
          "
        >
          {t('tournament.play')}
        </button>
      </div>
    )}
  </div>
</div>

          {/* Controls */}
          {ready && (
            <p className="mx-auto mt-5 text-center text-[14px] text-[#615050]">
              {currentMatch.p1}: W / S
              <span className="mx-3 text-[#B4AAAA]">·</span>
              {currentMatch.p2}: ↑ / ↓
            </p>
          )}

          {/* Bracket */}
          {!ready && (
            <div
              className="
                mx-auto
                mt-7
                w-full
                max-w-[1085px]
                rounded-[14px]
                border
                border-[#EEE9E6]
                bg-white
                px-5
                py-6
                md:px-6
              "
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p
                    className="
                      text-[13px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-[#615050]
                    "
                  >
                    {t('tournament.bracket')}
                  </p>

                  <p className="mt-1 text-[13px] text-[#918787]">
                  {t('tournament.bracketDescription')}
                  </p>
                </div>

                <span
                  className="
                    rounded-full
                    bg-[#F4F2EE]
                    px-4
                    py-2
                    text-[12px]
                    font-medium
                    uppercase
                    tracking-[0.06em]
                    text-[#615050]
                  "
                >
                  {currentMatch.round + 1} /{' '}
                  {tournament.rounds.length}
                </span>
              </div>

              <Bracket
                rounds={tournament.rounds}
                currentMatch={currentMatch}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- BRACKET

function Bracket({
  rounds,
  currentMatch,
}: {
  rounds: TournamentMatch[][];
  currentMatch: TournamentMatch | null;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="
        -mx-2
        flex
        max-w-full
        gap-3
        overflow-x-auto
        px-2
        pb-2
        sm:gap-5
      "
    >
      {rounds.map((round, roundIndex) => (
        <div
          key={roundIndex}
          className="
            flex
            min-w-[190px]
            flex-1
            flex-col
            gap-3
          "
        >
          <p
            className="
              text-center
              text-[11px]
              font-medium
              uppercase
              tracking-[0.12em]
              text-[#918787]
            "
          >
            {roundIndex === rounds.length - 1
              ? t('tournament.final')
              : `${t('tournament.round')} ${roundIndex + 1}`}
          </p>

          <div className="flex flex-1 flex-col justify-around gap-3">
            {round.map((match, matchIndex) => {
              const isCurrent =
                currentMatch?.round === match.round &&
                currentMatch?.index === match.index;

              return (
                <div
                  key={matchIndex}
                  className={`
                    overflow-hidden
                    rounded-[9px]
                    border
                    bg-white
                    transition-colors
                    ${
                      isCurrent
                        ? 'border-brand-red ring-1 ring-brand-red'
                        : 'border-[#E3DEDA]'
                    }
                  `}
                >
                  <MatchRow
                    name={match.p1}
                    isWinner={
                      Boolean(match.winner) &&
                      match.winner === match.p1
                    }
                    isCurrent={isCurrent}
                  />

                  <div className="border-t border-[#EEE9E6]" />

                  <MatchRow
                    name={match.p2}
                    isWinner={
                      Boolean(match.winner) &&
                      match.winner === match.p2
                    }
                    isCurrent={isCurrent}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchRow({
  name,
  isWinner,
  isCurrent,
}: {
  name: string | null;
  isWinner: boolean;
  isCurrent: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`
        flex
        min-h-[38px]
        items-center
        justify-between
        gap-2
        px-3
        py-2
        text-[13px]
        ${
          isWinner
            ? 'bg-[#EEF1EC] font-semibold text-[#6F7D68]'
            : isCurrent
              ? 'bg-[#FFF7F5] text-[#1A1A1A]'
              : name
                ? 'text-[#615050]'
                : 'text-[#B4AAAA]'
        }
      `}
    >
      <span className="truncate">
        {name ?? '—'}
      </span>

      {isWinner && (
        <span
          className="
            shrink-0
            text-[10px]
            font-bold
            uppercase
            tracking-[0.06em]
          "
        >
          {t('tournament.winner')}
        </span>
      )}
    </div>
  );
}