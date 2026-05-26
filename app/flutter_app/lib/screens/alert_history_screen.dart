import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/firestore_service.dart';
import '../widgets/status_widgets.dart';

class AlertHistoryScreen extends ConsumerWidget {
  const AlertHistoryScreen({super.key});

  static const routeName = '/alerts';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('알림 기록')),
      body: StreamBuilder(
        stream: ref.read(firestoreServiceProvider).watchAlerts(),
        builder: (context, snapshot) {
          final alerts = snapshot.data ?? const [];
          if (alerts.isEmpty) {
            return const Center(child: Text('알림이 없습니다.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: alerts.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final alert = alerts[index];
              return Card(
                child: ListTile(
                  leading: Icon(
                    alert.level == 'critical'
                        ? Icons.error_outline
                        : Icons.warning_amber_outlined,
                    color: alert.level == 'critical'
                        ? Theme.of(context).colorScheme.error
                        : const Color(0xFFB7791F),
                  ),
                  title: Text(alert.title),
                  subtitle: Text(
                    '${alert.printerId} · ${formatTime(alert.createdAt)}\n${alert.body}',
                  ),
                  isThreeLine: true,
                ),
              );
            },
          );
        },
      ),
    );
  }
}
