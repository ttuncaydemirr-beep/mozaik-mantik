// Birim testleri: bozuk kayıt, geri al/ileri al, otomatik X, ipucu aşama maliyetleri, çift tamamlama koruması.
import 'package:mozaik_core/mozaik_core.dart';
import 'package:test/test.dart';

import 'support.dart';

// c-001: 5×5, çözüm [2,0,3,1,4]
const _regions = 'ABBBBAABBBAACDDCCCDDCCCDE';
const _solution = [2, 0, 3, 1, 4];

Game _game({bool autoX = true, bool quick = false}) => Game(
    n: 5,
    regions: _regions,
    solution: List<int>.of(_solution),
    settings: GameSettings(autoX: autoX, quickStone: quick));

void main() {
  group('bozuk kayıt', () {
    final config = MozaikConfig();
    test('okunamayan JSON -> varsayılanlar', () {
      for (final raw in ['{', 'null', '[1,2]', '"x"', '42']) {
        final s = SaveState(MemoryKeyValueStore({SaveState.saveKey: raw}), config);
        expect(norm(s.load()), norm(SaveState.defaults(config)), reason: raw);
      }
    });
    test('yanlış türler varsayılana döner, bilinmeyen alanlar korunur', () {
      final s = SaveState(
          MemoryKeyValueStore({
            SaveState.saveKey:
                '{"hints":{"balance":"çok"},"settings":{"theme":"neon","autoX":1},"gallery":{},"zz":7,"daily":{"lastDay":"dün"}}'
          }),
          config);
      final d = s.load();
      expect(s.hints['balance'], 5);
      expect(s.settings['theme'], 'system');
      expect(s.settings['autoX'], true);
      expect(d['gallery'], isEmpty);
      expect(d['zz'], 7);
      expect(s.daily['lastDay'], isNull);
    });
    test('depo hata verirse bellekte sürer', () {
      final s = SaveState(_ThrowingStore(), config)..load();
      s.hints['balance'] = 9;
      s.save();
      expect(s.isPersistent, isFalse);
      expect(s.load()['hints']['balance'], 9);
    });
    test('Game.restore bozuk tahtayı reddeder, durum değişmez', () {
      final g = _game()..tap(0, 2);
      final before = cellsStr(g);
      expect(() => g.restore({'c': '9' * 25}), throwsFormatException);
      expect(() => g.restore({'c': '0' * 24}), throwsFormatException);
      expect(() => g.restore('x'), throwsFormatException);
      expect(cellsStr(g), before);
    });
    test('kayıt gidiş-dönüş', () {
      final g = _game()
        ..tap(0, 2)
        ..tap(0, 2)
        ..tap(1, 4)
        ..elapsed = 4321.4;
      final g2 = _game()..restore(norm(g.serialize()));
      expect(norm(g2.serialize()), norm(g.serialize()));
      expect(g2.serialize()['e'], 4321);
    });
  });

  group('geri al / ileri al', () {
    test('dokunuş ve otomatik X tek adım; yeni hamle ileri al yığınını siler', () {
      final g = _game();
      g.tap(0, 2); // X
      g.tap(0, 2); // taş (+ otomatik X)
      expect(g.cells[2], cellStone);
      expect(g.undoDepth, 2);
      expect(g.undo(), isTrue);
      expect(g.cells[2], cellX);
      expect(g.cells.where((v) => v == cellAuto), isEmpty);
      expect(g.redo(), isTrue);
      expect(g.cells[2], cellStone);
      expect(g.undo(), isTrue);
      expect(g.canRedo(), isTrue);
      g.tap(4, 4);
      expect(g.canRedo(), isFalse);
      expect(g.redo(), isFalse);
    });
    test('sürükleme taşa dokunmaz', () {
      final g = _game();
      g.longPress(0, 2);
      expect(g.dragBegin(3, 0), 'add');
      expect(g.dragOver(3, 1), isTrue);
      expect(g.dragOver(0, 2), isFalse);
      expect(g.dragEnd(), isTrue);
      expect(g.cells[2], cellStone);
      expect(g.cells[3 * 5 + 1], cellX);
      expect(g.undo(), isTrue);
      expect(g.cells[3 * 5 + 1], cellEmpty);
      expect(g.cells[2], cellStone);
    });
    test('sürükleme X koyar/siler', () {
      final g = _game(autoX: false);
      expect(g.dragBegin(2, 0), 'add');
      expect(g.dragOver(2, 1), isTrue);
      expect(g.dragOver(2, 2), isTrue);
      expect(g.dragEnd(), isTrue);
      expect(g.undoDepth, 1);
      expect(g.dragBegin(2, 1), 'erase');
      g.dragOver(2, 2);
      g.dragCancel();
      expect(g.cells[2 * 5 + 2], cellX);
      expect(g.undo(), isTrue);
      expect(g.cells.every((v) => v == cellEmpty), isTrue);
    });
    test('kazanınca geri al kapalı', () {
      final g = _game()..tap(0, 0);
      g.won = true;
      expect(g.canUndo(), isFalse);
      expect(g.undo(), isFalse);
    });
  });

  group('otomatik X', () {
    test('taş satır/sütun/bölge/komşulara otomatik X koyar; elle X korunur', () {
      final g = _game();
      g.tap(4, 0); // elle X (satır 4, taşın satırı değil)
      g.longPress(0, 2);
      final att = g.attackedCells(2);
      for (final i in att) {
        expect(g.cells[i] == cellAuto || g.cells[i] == cellX, isTrue);
      }
      expect(g.cells[4 * 5 + 0], cellX);
      g.longPress(0, 2); // taşı kaldır
      expect(g.cells.where((v) => v == cellAuto), isEmpty);
      expect(g.cells[4 * 5 + 0], cellX);
    });
    test('başka taşın gerekçelendirdiği otomatik X kalır', () {
      final g = _game();
      g.longPress(0, 2);
      g.longPress(1, 0);
      final both = [for (var i = 0; i < 25; i++) if (g.attacks(2, i) && g.attacks(5, i) && g.cells[i] == cellAuto) i];
      g.longPress(0, 2);
      for (final i in both) {
        expect(g.cells[i], cellAuto);
      }
    });
    test('kapalıyken otomatik X yok', () {
      final g = _game(autoX: false)..longPress(0, 2);
      expect(g.cells.where((v) => v == cellAuto), isEmpty);
    });
    test('çakışan taş hata sayar', () {
      final g = _game();
      g.longPress(0, 2);
      final r = g.longPress(0, 4);
      expect(r.bad, isTrue);
      expect(r.areas.map((a) => a.type), contains('row'));
      expect(g.errors, 1);
    });
  });

  group('ipucu aşama maliyetleri (1 / 0 / 1)', () {
    test('tam ipucu 2 hak', () {
      final g = _game();
      final w = TestWallet(5);
      expect(g.hintNextCost(), 1);
      expect(g.hintPress(w).status, 'stage1');
      expect(w.bal, 4);
      expect(g.hintNextCost(), 0);
      expect(g.hintPress(w).status, 'stage2');
      expect(w.bal, 4);
      expect(g.hintNextCost(), 1);
      final r = g.hintPress(w);
      expect(r.status, 'applied');
      expect(r.changed, isTrue);
      expect(w.bal, 3);
      expect(g.hints, 1);
      expect(g.hintStage(), 0);
    });
    test('bakiye yetmezse reklam ister', () {
      final g = _game();
      expect(g.hintPress(TestWallet(0)).status, 'need-ad');
      final w = TestWallet(1);
      g.hintPress(w);
      g.hintPress(w);
      expect(g.hintPress(w).status, 'need-ad');
      expect(g.hintStage(), 2);
    });
    test('ödenmiş ipucu yeniden açılınca ücretsiz', () {
      final g = _game();
      final w = TestWallet(5);
      g.hintPress(w);
      g.hint = null; // ipucu kapandı (ör. ekran yenilendi)
      expect(g.hintNextCost(), 0);
      expect(g.hintPress(w).status, 'stage1');
      expect(w.bal, 4);
    });
    test('öğreticide ve kazanınca ipucu yok', () {
      final t = Game(n: 5, regions: _regions, solution: List<int>.of(_solution), mode: 'tutorial');
      expect(t.hintPress(TestWallet(5)).status, 'none');
      final g = _game()..won = true;
      expect(g.hintPress(TestWallet(5)).status, 'none');
    });
  });

  group('çift tamamlama koruması', () {
    late SaveState state;
    late Progress progress;
    late Economy eco;
    late LevelData data;
    setUp(() {
      final config = MozaikConfig();
      state = SaveState(MemoryKeyValueStore(), config)..load();
      final daily = Daily(config);
      eco = Economy(state, config, daily);
      data = repoData(config);
      progress = Progress(state, config, data, eco, daily, FixedClock(DateTime.utc(2026, 11, 22, 10)));
    });
    test('günlük bulmaca aynı gün ikinci kez: seri ve ödül tekrar verilmez', () {
      final a = progress.completeDaily('2026-11-22', FakeStats(0, 0, 5000, ['c']));
      expect(a.first, isTrue);
      expect(a.hintBonus, 1);
      final bal = eco.balance();
      final b = progress.completeDaily('2026-11-22', FakeStats(3, 3, 9000, ['h']));
      expect(b.first, isFalse);
      expect(b.hintBonus, 0);
      expect(eco.balance(), bal);
      expect(state.daily['streak'], 1);
      expect(b.record!['time'], 5000);
    });
    test('seviye tekrarı: yıldız düşmez, benzersiz sayı artmaz', () {
      final lv = data.level('c-001')!;
      progress.completeLevel(lv, FakeStats(0, 0, 3000, const []));
      final r = progress.completeLevel(lv, FakeStats(2, 5, 2000, const []));
      expect(state.levels['c-001'], {'stars': 3, 'best': 2000, 'done': 2});
      expect(r.newPiece, isFalse);
      expect(eco.uniqueCompleted(), 1);
      expect(state.ads['completions'], 2);
    });
    test('kazanılmış oyunda hamle yok', () {
      final g = _game();
      for (var r = 0; r < 5; r++) {
        g.longPress(r, _solution[r]);
      }
      expect(g.isComplete(), isTrue);
      g.won = true;
      expect(g.tap(0, 0).changed, isFalse);
      expect(g.longPress(0, 0).changed, isFalse);
      expect(g.dragBegin(0, 0), isNull);
    });
  });
}

class _ThrowingStore implements KeyValueStore {
  @override
  String? getString(String key) => throw StateError('yok');
  @override
  void setString(String key, String value) => throw StateError('yok');
  @override
  void remove(String key) => throw StateError('yok');
}
