// Game olay dizileri (dokunma, uzun basma, sürükleme, geri/ileri al, ipucu akışı, kayıt) — JS ile birebir.
import 'dart:convert';

import 'package:mozaik_core/mozaik_core.dart';
import 'package:test/test.dart';

import 'support.dart';

Game makeGame(Map<String, dynamic> o) {
  final s = o['settings'] as Map<String, dynamic>;
  return Game(
    n: o['n'] as int,
    regions: o['regions'] as String,
    solution: intList(o['solution']),
    settings: GameSettings(autoX: s['autoX'] as bool, quickStone: s['quickStone'] as bool),
    mode: o['mode'] as String,
    tutFirst: o['tutFirst'] as int?,
  );
}

void main() {
  final scen = (loadGolden('game.json') as List).cast<Map<String, dynamic>>();
  group('Game olay dizileri', () {
    for (var q = 0; q < scen.length; q++) {
      final sc = scen[q];
      test('senaryo $q', () {
        final opts = sc['opts'] as Map<String, dynamic>;
        final mode = opts['mode'] as String;
        final g = makeGame(opts);
        final w = TestWallet(sc['bal0'] as num);
        final ops = sc['ops'] as List;
        for (var k = 0; k < ops.length; k++) {
          final rec = ops[k] as Map<String, dynamic>;
          final op = rec['op'] as List;
          Object? ret;
          switch (op[0] as String) {
            case 'tap':
              ret = g.tap(op[1] as int, op[2] as int);
            case 'longPress':
              ret = g.longPress(op[1] as int, op[2] as int);
            case 'drag':
              final st = op[1] as List;
              final m = g.dragBegin(st[0] as int, st[1] as int);
              final over = [for (final p in op[2] as List) g.dragOver((p as List)[0] as int, p[1] as int)];
              Object end;
              if (op[3] as bool) {
                g.dragCancel();
                end = 'cancel';
              } else {
                end = g.dragEnd();
              }
              ret = {'m': m, 'over': over, 'end': end};
            case 'undo':
              ret = g.undo();
            case 'redo':
              ret = g.redo();
            case 'hintPress':
              ret = g.hintPress(w);
            case 'grant':
              w.bal += op[1] as num;
            case 'applyHint':
              final h = g.getHint();
              ret = h == null ? 'none' : g.applyHint(h);
            case 'setWon':
              g.won = op[1] as bool;
            case 'roundtrip':
              final ser = norm(g.serialize());
              final g2 = makeGame(opts)..restore(ser);
              ret = jsonEncode(norm(g2.serialize())) == jsonEncode(ser);
            default:
              fail('bilinmeyen işlem ${op[0]}');
          }
          final why = 'adım $k ${op[0]}';
          expect(norm(ret), rec['ret'], reason: '$why dönüş');
          expect(cellsStr(g), rec['c'], reason: '$why tahta');
          expect(g.log.map((e) => '${e.i}${e.h ? 'h' : ''}${e.x ? 'x' : ''}').join(','), rec['l'], reason: '$why log');
          expect(g.errors, rec['x'], reason: '$why hata');
          expect(g.hints, rec['hi'], reason: '$why ipucu');
          expect(g.undoDepth, rec['u'], reason: '$why geri al yığını');
          expect(g.redoDepth, rec['r'], reason: '$why ileri al yığını');
          expect(g.hintStage(), rec['st'], reason: '$why aşama');
          expect(g.won || mode == 'tutorial' ? null : g.hintNextCost(), rec['cost'], reason: '$why maliyet');
          expect(w.bal, rec['bal'], reason: '$why bakiye');
          expect(g.canUndo(), rec['cu'], reason: '$why canUndo');
          expect(g.canRedo(), rec['cr'], reason: '$why canRedo');
          expect(g.isComplete(), rec['done'], reason: '$why tamam');
          expect(g.nextTutorialTarget(), rec['tt'], reason: '$why öğretici hedef');
        }
        expect(norm(g.serialize()), sc['ser']);
        expect(g.strip(), sc['strip']);
      });
    }
  });
}
