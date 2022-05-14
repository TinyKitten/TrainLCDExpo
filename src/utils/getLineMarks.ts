import { OMIT_JR_THRESHOLD } from '../constants';
import { MarkShape } from '../constants/numbering';
import { getLineMark, getLineMarkGrayscale, LineMark } from '../lineMark';
import { Line, LineType } from '../models/StationAPI';
import { isJRLine } from './jr';

const mockJR = {
  shape: MarkShape.reversedSquare,
  sign: 'JR',
};

const getLineMarks = ({
  transferLines,
  omittedTransferLines,
  grayscale,
}: {
  transferLines: Line[];
  omittedTransferLines: Line[];
  grayscale?: boolean;
}): (LineMark | null)[] => {
  const notJRLines = transferLines.filter((l) => !isJRLine(l));
  const jrLines = transferLines
    .filter((l: Line) => isJRLine(l))
    .filter((l: Line) => l.lineType !== LineType.BulletTrain);
  const bulletTrains = transferLines.filter(
    (l) => l.lineType === LineType.BulletTrain
  );
  const jrLineUnionMark = jrLines.reduce<LineMark>(
    (acc, cur) => {
      const lineMark = grayscale ? getLineMarkGrayscale(cur) : getLineMark(cur);
      return {
        ...acc,
        jrUnionSigns: lineMark?.sign
          ? Array.from(new Set([...(acc.jrUnionSigns || []), lineMark.sign]))
          : acc.jrUnionSigns,
        jrUnionSignPaths: lineMark?.signPath
          ? Array.from(
              new Set([...(acc.jrUnionSignPaths || []), lineMark.signPath])
            )
          : acc.jrUnionSignPaths,
      };
    },
    {
      shape: MarkShape.jrUnion,
      jrUnionSigns: [],
      jrUnionSignPaths: [],
    }
  );

  const bulletTrainUnionMarkOrigin = bulletTrains.reduce<LineMark>(
    (acc, cur) => {
      const lineMark = grayscale ? getLineMarkGrayscale(cur) : getLineMark(cur);
      return {
        ...acc,
        btUnionSigns: lineMark?.sign
          ? Array.from(new Set([...(acc.btUnionSigns || []), lineMark.sign]))
          : acc.btUnionSigns,
        btUnionSignPaths: lineMark?.signPath
          ? Array.from(
              new Set([...(acc.btUnionSignPaths || []), lineMark.signPath])
            )
          : acc.btUnionSignPaths,
      };
    },
    {
      shape: MarkShape.bulletTrainUnion,
      btUnionSigns: [],
      btUnionSignPaths: [],
    }
  );
  const bulletTrainUnionMark =
    bulletTrainUnionMarkOrigin.btUnionSignPaths || [].length > 0
      ? bulletTrainUnionMarkOrigin
      : null;
  const withoutJRLineMarks = notJRLines.map((l) =>
    grayscale ? getLineMarkGrayscale(l) : getLineMark(l)
  );
  const isJROmitted = jrLines.length >= OMIT_JR_THRESHOLD;

  const jrLineUnionMarkWithMock =
    (jrLineUnionMark?.jrUnionSignPaths?.length || 0) === 0
      ? mockJR
      : jrLineUnionMark;

  return (
    isJROmitted
      ? [
          ...[bulletTrainUnionMark, jrLineUnionMarkWithMock].filter((m) => !!m),
          ...withoutJRLineMarks,
        ]
      : omittedTransferLines.map((l) =>
          grayscale ? getLineMarkGrayscale(l) : getLineMark(l)
        )
  ).filter(
    (lm: LineMark | null) =>
      lm?.btUnionSignPaths?.length !== 0 || lm?.btUnionSigns?.length !== 0
  );
};

export default getLineMarks;
