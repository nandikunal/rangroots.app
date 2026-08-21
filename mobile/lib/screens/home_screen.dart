import 'package:flutter/material.dart';
import 'calendar_screen.dart';
import 'events_screen.dart';

/// Home screen: two primary actions + city selector + today's highlights.
/// Per MVP UX spec: keep this screen minimal, progressive disclosure elsewhere.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String selectedCity = 'Berlin'; // TODO: replace with persisted/detected city

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rang Roots')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('City: $selectedCity', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CalendarScreen()),
              ),
              child: const Text('Hindu calendar & muhurta'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const EventsScreen()),
              ),
              child: const Text('Indian events in your city'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
